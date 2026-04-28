import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ─── Waste taxonomy (matches database enum) ───
type WasteCategory =
  | "cardboard"
  | "metal"
  | "paper"
  | "plastic"
  | "glass"
  | "organic"
  | "mixed";

const VALID_CATEGORIES: WasteCategory[] = [
  "cardboard",
  "metal",
  "paper",
  "plastic",
  "glass",
  "organic",
  "mixed",
];

// Categories the AI might output that need to be remapped
const CATEGORY_ALIASES: Record<string, WasteCategory> = {
  hazardous: "mixed",
  "e-waste": "mixed",
  ewaste: "mixed",
  other: "mixed",
};

// ─── Gemini model fallback list ───
// Each model has its own separate per-model daily quota on the free tier.
// By listing multiple models, we maximise available quota buckets.
// Order: fastest/cheapest first, heavier models as last resort.
const GEMINI_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

// Per-model request timeout in milliseconds
const MODEL_TIMEOUT_MS = 8_000;
// Max retries per model on transient (503/429) errors
const MAX_RETRIES_PER_MODEL = 3;

// ─── Expert system prompt ───
const SYSTEM_PROMPT = `You are an expert waste classification AI developed for a municipal waste management system.

Your task: Analyze the provided image and classify the waste material into EXACTLY ONE of these 7 categories:
- cardboard: Corrugated cardboard, shipping boxes, cereal boxes, pizza boxes, cardboard tubes, egg cartons
- paper: Office paper, newspapers, magazines, books, receipts, envelopes, paper bags, tissue paper
- plastic: PET bottles, HDPE containers, plastic bags, food wrappers, styrofoam, plastic cups, straws, packaging film
- glass: Glass bottles, glass jars, broken glass, glass containers, window glass
- metal: Aluminum cans, tin cans, steel containers, foil, metal lids, scrap metal, wire
- organic: Food scraps, fruit/vegetable peels, coffee grounds, tea bags, yard waste, leaves, flowers, wood chips
- mixed: Items that contain multiple inseparable materials, heavily contaminated waste, hazardous items (batteries, electronics, paint, chemicals), or items that don't clearly fit a single category

Classification rules:
1. Focus on the PRIMARY material of the dominant waste item in the image.
2. A plastic water bottle is PLASTIC, not glass. A cardboard box is CARDBOARD, not paper.
3. If food is still in a container, classify by the container material unless only food waste is visible.
4. Hazardous items (batteries, e-waste, chemicals) should be classified as "mixed".
5. Be precise — avoid defaulting to "mixed" unless truly ambiguous or hazardous.
6. Confidence should reflect how certain you are: 0.95+ for obvious items, 0.7-0.94 for clear but imperfect, 0.4-0.69 for uncertain.

You MUST respond with ONLY valid JSON in this exact format, no markdown, no explanation:
{"category":"<one of the 7 categories>","confidence":<number between 0 and 1>,"reasoning":"<one sentence explaining your classification>"}`;

function sanitizeBase64(input: string): string {
  const trimmed = input.trim();
  const raw = trimmed.includes(",") ? trimmed.split(",").pop()! : trimmed;
  return raw.replace(/\s/g, "");
}

function detectMimeType(base64: string): string {
  // Check the first bytes of the decoded data for magic numbers
  const header = base64.substring(0, 20);
  if (header.startsWith("/9j/")) return "image/jpeg";
  if (header.startsWith("iVBOR")) return "image/png";
  if (header.startsWith("R0lGOD")) return "image/gif";
  if (header.startsWith("UklGR")) return "image/webp";
  return "image/jpeg"; // default fallback
}

/** Classify an error message into an actionable bucket */
function classifyError(msg: string): "rate_limit" | "overloaded" | "not_found" | "unknown" {
  if (msg.includes("404") || msg.includes("not found") || msg.includes("not supported")) return "not_found";
  if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) return "rate_limit";
  if (msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("UNAVAILABLE")) return "overloaded";
  return "unknown";
}

/** Run a promise with an AbortController‑style timeout */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rateLimit = checkRateLimit(
      `classify:${clientIp}`,
      RATE_LIMITS.classify,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          predicted_class: null,
          confidence: 0,
          ai_available: false,
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.resetMs / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const rawImage = body.image || body.image_base64;

    if (!rawImage || typeof rawImage !== "string") {
      return NextResponse.json({
        predicted_class: null,
        confidence: 0,
        ai_available: false,
        message: "No image provided",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({
        predicted_class: null,
        confidence: 0,
        ai_available: false,
        message: "Gemini API key is not configured",
      });
    }

    const imageBase64 = sanitizeBase64(rawImage);
    const mimeType = detectMimeType(imageBase64);

    // Validate the image data is not empty
    const testBuffer = Buffer.from(imageBase64, "base64");
    if (testBuffer.length < 100) {
      return NextResponse.json({
        predicted_class: null,
        confidence: 0,
        ai_available: false,
        message: "Image data is too small or corrupted",
      });
    }

    console.log(`=== Gemini Waste Classification ===`);
    console.log(`Image size: ${testBuffer.length} bytes, MIME: ${mimeType}`);

    // ─── Try Gemini models with aggressive fallback ───
    const genAI = new GoogleGenerativeAI(geminiKey);
    let geminiResult: {
      category: WasteCategory;
      confidence: number;
      reasoning: string;
    } | null = null;
    let usedModel = "";

    for (const modelName of GEMINI_MODELS) {
      // Attempt each model up to MAX_RETRIES_PER_MODEL times on transient errors
      for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
        try {
          console.log(
            `  → Trying model: ${modelName} (attempt ${attempt + 1})`,
          );

          const model = genAI.getGenerativeModel({ model: modelName });

          const result = await withTimeout(
            model.generateContent([
              { text: SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ]),
            MODEL_TIMEOUT_MS,
            modelName,
          );

          const response = result.response;
          const text = response.text().trim();
          console.log(`  ← Raw response: ${text.substring(0, 200)}`);

          // Parse the JSON response (strip markdown if present)
          const jsonStr = text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();

          const parsed = JSON.parse(jsonStr);

          // Validate the response
          if (parsed.category && typeof parsed.confidence === "number") {
            let normalizedCategory = parsed.category.toLowerCase().trim();

            // Remap known aliases (e.g. hazardous → mixed)
            if (CATEGORY_ALIASES[normalizedCategory]) {
              normalizedCategory = CATEGORY_ALIASES[normalizedCategory];
            }

            if (
              VALID_CATEGORIES.includes(normalizedCategory as WasteCategory)
            ) {
              geminiResult = {
                category: normalizedCategory as WasteCategory,
                confidence: Math.max(0, Math.min(1, parsed.confidence)),
                reasoning: parsed.reasoning || "Classified by Gemini Vision AI",
              };
              usedModel = modelName;
              console.log(
                `  ✓ Classification: ${geminiResult.category} (${Math.round(geminiResult.confidence * 100)}%) via ${modelName}`,
              );
              break;
            }
          }

          console.warn(`  ✗ Invalid response structure from ${modelName}`);
          break; // Don't retry on bad response structure — move to next model
        } catch (modelError: any) {
          const msg = modelError.message || "";
          const errorType = classifyError(msg);

          if (errorType === "not_found") {
            console.warn(`  ✗ Model ${modelName} not found — skipping`);
            break; // No point retrying a 404
          }

          if ((errorType === "rate_limit" || errorType === "overloaded") && attempt < MAX_RETRIES_PER_MODEL - 1) {
            // Exponential backoff: 1s, 2s, 4s
            const waitMs = 1000 * 2 ** attempt;
            console.warn(
              `  ⏳ ${errorType === "rate_limit" ? "Rate-limited" : "503 overloaded"} on ${modelName}, retrying in ${waitMs}ms...`,
            );
            await new Promise((r) => setTimeout(r, waitMs));
            continue; // Retry same model
          }

          console.warn(
            `  ✗ Model ${modelName} failed (${errorType}): ${msg.substring(0, 120)}`,
          );
          break; // Move to next model
        }
      }
      if (geminiResult) break; // Exit outer loop if we got a result
    }

    if (!geminiResult) {
      return NextResponse.json({
        predicted_class: "mixed",
        confidence: 0.3,
        ai_available: false,
        message:
          "All Gemini models failed. Defaulting to manual classification.",
        method: "fallback",
      });
    }

    return NextResponse.json({
      predicted_class: geminiResult.category,
      confidence: geminiResult.confidence,
      ai_available: true,
      reasoning: geminiResult.reasoning,
      method: "gemini-vision",
      model: usedModel,
    });
  } catch (error: any) {
    console.error("Classification pipeline error:", error);
    return NextResponse.json({
      predicted_class: null,
      confidence: 0,
      ai_available: false,
      message: error.message || "Classification failed",
    });
  }
}
