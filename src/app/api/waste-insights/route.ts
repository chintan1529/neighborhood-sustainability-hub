import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    // Fetch user's recent reports (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reports } = await admin
      .from("waste_reports")
      .select("confirmed_class, predicted_class, quantity_estimate, created_at")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        success: true,
        insight: {
          title: "Start Your Journey!",
          message:
            "Submit your first waste report to receive personalized waste reduction insights powered by AI.",
          tips: [
            "Take a photo of waste you see in your neighborhood",
            "Our AI will classify it automatically",
            "Over time, you'll get personalized reduction tips",
          ],
          category_focus: null,
          trend: null,
        },
      });
    }

    // Build category breakdown
    const catMap: Record<string, number> = {};
    reports.forEach((r: any) => {
      const cat = r.confirmed_class || r.predicted_class || "mixed";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const totalReports = reports.length;

    // Try AI-powered insight
    const hfToken = process.env.HUGGING_FACE_API_TOKEN;
    if (hfToken) {
      try {
        const client = new InferenceClient(hfToken);

        const categoryBreakdown = Object.entries(catMap)
          .map(
            ([cat, count]) =>
              `${cat}: ${count} reports (${Math.round((count / totalReports) * 100)}%)`,
          )
          .join(", ");

        const result = await client.chatCompletion({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: [
            {
              role: "system",
              content: `You are a waste reduction advisor for an urban sustainability app. A resident has submitted ${totalReports} waste reports in the last 30 days. Their category breakdown is: ${categoryBreakdown}.

Give a personalized insight with:
1. A short catchy title (max 8 words)
2. A one-paragraph insight about their waste pattern (2-3 sentences)
3. Exactly 3 actionable tips to reduce their most common waste type

Respond ONLY with valid JSON:
{"title": "...", "message": "...", "tips": ["...", "...", "..."]}
No other text.`,
            },
            {
              role: "user",
              content: `My waste reporting breakdown for the last 30 days: ${categoryBreakdown}. What can I do better?`,
            },
          ],
          max_tokens: 300,
        });

        const content = result?.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            insight: {
              title: parsed.title || "Your Waste Insights",
              message:
                parsed.message || "Keep reporting to get better insights!",
              tips: parsed.tips || [],
              category_focus: topCategory?.[0] || null,
              trend: {
                topCategory: topCategory?.[0],
                topCategoryCount: topCategory?.[1],
                totalReports,
                breakdown: catMap,
              },
            },
          });
        }
      } catch (aiError) {
        console.log("AI insight generation failed, using fallback:", aiError);
      }
    }

    // Fallback: rule-based insights
    const TIPS: Record<string, string[]> = {
      plastic: [
        "Carry a reusable water bottle and shopping bags",
        "Choose products with minimal or paper-based packaging",
        "Avoid single-use cutlery — keep a set at your desk",
      ],
      organic: [
        "Start composting kitchen scraps in a small bin",
        "Plan meals ahead to reduce food waste by up to 30%",
        "Store fruits and vegetables properly to extend freshness",
      ],
      paper: [
        "Go digital — use e-bills and cloud storage",
        "Print double-sided and reuse scrap paper for notes",
        "Cancel unwanted magazine and catalog subscriptions",
      ],
      cardboard: [
        "Consolidate online orders to reduce packaging",
        "Flatten and recycle all cardboard boxes immediately",
        "Opt for in-store pickup instead of home delivery",
      ],
      metal: [
        "Rinse and recycle all aluminum cans and tin containers",
        "Choose refillable containers over disposable tins",
        "Separate metal caps from glass bottles for proper recycling",
      ],
      glass: [
        "Reuse glass jars for food storage and organization",
        "Buy beverages in refillable glass containers when possible",
        "Drop off glass at recycling centers for proper processing",
      ],
      mixed: [
        "Sort your waste into separate bins before disposal",
        "Learn your neighborhood's recycling guidelines",
        "Aim to reduce overall waste by 10% each month",
      ],
    };

    const focus = topCategory?.[0] || "mixed";
    const percentage = Math.round(
      ((topCategory?.[1] || 0) / totalReports) * 100,
    );

    return NextResponse.json({
      success: true,
      insight: {
        title: `${percentage}% of Your Waste is ${focus.charAt(0).toUpperCase() + focus.slice(1)}`,
        message: `In the last 30 days, you\'ve reported ${totalReports} waste items. ${focus.charAt(0).toUpperCase() + focus.slice(1)} waste makes up the largest share at ${percentage}%. Here are some practical ways to reduce it.`,
        tips: TIPS[focus] || TIPS.mixed,
        category_focus: focus,
        trend: {
          topCategory: topCategory?.[0],
          topCategoryCount: topCategory?.[1],
          totalReports,
          breakdown: catMap,
        },
      },
    });
  } catch (error: any) {
    console.error("Waste insights error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate insights" },
      { status: 500 },
    );
  }
}
