import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from '@huggingface/inference';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const SYSTEM_PROMPT = `You are "Eco Guide", a friendly and knowledgeable AI assistant for the Neighborhood Sustainability Hub (NHS) application. You help residents with waste management, recycling, and sustainability questions.

Your expertise includes:
- Waste classification (plastic, glass, metal, paper, cardboard, organic, hazardous, mixed)
- Recycling rules and best practices
- Composting guidance
- E-waste and hazardous waste disposal
- Local waste management tips for Indian cities
- Sustainability and environmental impact

Guidelines:
- Be concise but thorough (3-5 sentences max per response)
- Use bullet points for lists
- Always suggest the most eco-friendly disposal option
- If analyzing an image, identify what the waste item is and suggest the correct disposal method
- Include a practical tip when relevant
- Use emojis sparingly for friendliness (1-2 max)
- If unsure, recommend checking with local municipal guidelines

Format responses clearly with bold (**text**) for key terms.`;

export async function POST(request: NextRequest) {
    try {
        // Rate limit check
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const rateLimit = checkRateLimit(`eco-guide:${clientIp}`, RATE_LIMITS.ecoGuide);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { reply: 'You are sending messages too quickly. Please wait a moment and try again.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetMs / 1000)) } }
            );
        }

        const body = await request.json();
        const { message, image } = body;

        if (!message && !image) {
            return NextResponse.json({
                reply: 'Please send a message or upload an image for me to help with!',
            });
        }

        const hfToken = process.env.HUGGING_FACE_API_TOKEN;

        if (!hfToken) {
            return NextResponse.json({
                reply: getFallbackResponse(message || ''),
            });
        }

        const client = new InferenceClient(hfToken);

        // Build message content
        const userContent: any[] = [];

        if (image) {
            userContent.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` },
            });
        }

        userContent.push({
            type: 'text',
            text: message || 'What type of waste is shown in this image? How should it be disposed of?',
        });

        try {
            // Try Qwen VLM (supports images)
            const result = await client.chatCompletion({
                model: image ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'Qwen/Qwen2.5-72B-Instruct',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userContent },
                ],
                max_tokens: 300,
            });

            if (result?.choices?.[0]?.message?.content) {
                return NextResponse.json({
                    reply: result.choices[0].message.content,
                });
            }
        } catch (primaryError: any) {
            console.log('Primary model failed:', primaryError.message);

            // Fallback: try text-only model
            if (!image) {
                try {
                    const result2 = await client.chatCompletion({
                        model: 'mistralai/Mistral-7B-Instruct-v0.3',
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: message },
                        ],
                        max_tokens: 300,
                    });

                    if (result2?.choices?.[0]?.message?.content) {
                        return NextResponse.json({
                            reply: result2.choices[0].message.content,
                        });
                    }
                } catch (fallbackError: any) {
                    console.log('Fallback model also failed:', fallbackError.message);
                }
            }
        }

        // If all AI models fail, use rule-based fallback
        return NextResponse.json({
            reply: getFallbackResponse(message || ''),
        });
    } catch (error: any) {
        console.error('Eco Guide error:', error);
        return NextResponse.json({
            reply: "I'm having trouble processing your request right now. Please try again in a moment.",
        });
    }
}

// Rule-based fallback responses when AI is unavailable
function getFallbackResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('recyclable') || lower.includes('recycle')) {
        return "♻️ **Common recyclables** include clean paper, cardboard, glass bottles, metal cans, and plastic bottles (types 1 & 2).\n\n**Not recyclable**: Greasy pizza boxes, plastic bags, styrofoam, and food-contaminated packaging.\n\n**Tip**: Rinse containers before recycling — clean items have a much higher chance of actually being recycled!";
    }

    if (lower.includes('compost')) {
        return "🌱 **What to compost**: Fruit/vegetable scraps, coffee grounds, tea bags, eggshells, yard waste, and shredded paper.\n\n**Avoid composting**: Meat, dairy, oily foods, and pet waste.\n\n**Tip**: Keep a small bin in your kitchen for daily scraps, then transfer to your main compost pile weekly!";
    }

    if (lower.includes('e-waste') || lower.includes('electronic') || lower.includes('battery')) {
        return "🔋 **E-waste** (batteries, phones, chargers, computers) should **never** go in regular trash.\n\n**Where to dispose**: Look for certified e-waste collection centers in your area, or drop at authorized recycler shops.\n\n**Tip**: Many electronics stores accept old devices for recycling. Check with your nearest one!";
    }

    if (lower.includes('plastic')) {
        return "🧴 **Plastic recycling guide**:\n- **Type 1 (PET)**: Water bottles → Recyclable ✅\n- **Type 2 (HDPE)**: Milk jugs, detergent → Recyclable ✅\n- **Type 5 (PP)**: Yogurt cups → Check locally\n- **Type 6 (PS/Styrofoam)**: Usually NOT recyclable ❌\n\n**Tip**: Look for the recycling number inside the triangle symbol on the bottom of the container!";
    }

    if (lower.includes('hazardous') || lower.includes('paint') || lower.includes('chemical')) {
        return "⚠️ **Hazardous waste** includes paints, solvents, pesticides, and cleaning chemicals.\n\n**Never pour down drains** or mix with regular trash. Take to your local **hazardous waste collection** facility.\n\n**Tip**: Many cities have periodic hazardous waste collection drives — check your municipal website!";
    }

    return "I'd love to help! Here are things I can assist with:\n\n- **\"Is this recyclable?\"** — I'll tell you the best disposal method\n- **\"Composting tips\"** — Learn what's compostable\n- **\"E-waste disposal\"** — Safe ways to dispose electronics\n- **\"Plastic types guide\"** — Understanding recycling symbols\n\nTry asking a specific question, or upload a photo of a waste item!";
}
