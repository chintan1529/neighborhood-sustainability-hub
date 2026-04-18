import { NextRequest, NextResponse } from "next/server";
import { generatePredictions, expireMissedPredictions } from "@/lib/predictive-engine";

/**
 * Automated Prediction Cycle — Cron API Route
 *
 * This endpoint drives the autonomous prediction engine. It should be called
 * on a schedule (e.g., every 6 hours via Vercel Cron or an external scheduler).
 *
 * Flow:
 *   1. Expire missed predictions (marks overdue active predictions as "missed")
 *   2. Record feedback cycles for expired zones (triggers adaptive weight updates)
 *   3. Generate fresh predictions from current waste report clusters
 *
 * Security: Protected by CRON_SECRET environment variable.
 *
 * Patent relevance: This is the automation layer that makes the predictive
 * hotspot engine "autonomous" — without this, predictions require manual trigger.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Phase 1: Expire missed predictions and trigger feedback loops
    const expiryResult = await expireMissedPredictions();

    // Phase 2: Generate fresh predictions
    const predictionResult = await generatePredictions();

    const duration = Date.now() - startTime;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      expired: expiryResult.expiredCount,
      predictions_generated: predictionResult.predictions.length,
      candidates_evaluated: predictionResult.candidateCount,
      filtered_below_threshold: predictionResult.filteredOut,
      rescued_from_cold_zone: predictionResult.rescuedCount,
      source: predictionResult.source,
      effective_threshold: predictionResult.threshold,
      adaptive_weights: predictionResult.weights,
    };

    console.log("[Cron:Predictions]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[Cron:Predictions] FAILED:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// Vercel Cron configuration
export const runtime = "nodejs";
export const maxDuration = 60; // seconds
