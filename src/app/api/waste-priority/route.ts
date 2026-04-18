import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateBatchPriority,
  type PriorityInput,
} from "@/lib/priority-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional filter from query params
    const { searchParams } = new URL(request.url);
    const tierFilter = searchParams.get("tier"); // 'critical', 'high', 'medium', 'low'
    const statusFilter = searchParams.get("status") || "pending";

    // Fetch active reports
    const query = supabase
      .from("waste_reports")
      .select(
        "id, status, predicted_class, confirmed_class, prediction_confidence, latitude, longitude, address_text, quantity_estimate, created_at, notes",
      )
      .order("created_at", { ascending: true });

    if (statusFilter === "all") {
      query.in("status", ["pending", "assigned", "in_progress"]);
    } else {
      query.eq(
        "status",
        statusFilter as import("@/types/database").ReportStatus,
      );
    }

    const { data: reports, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        success: true,
        reports: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      });
    }

    // Map to PriorityInput
    const priorityInputs: PriorityInput[] = reports.map((r) => ({
      id: r.id,
      wasteType: r.confirmed_class || r.predicted_class || "mixed",
      createdAt: r.created_at,
      quantity: r.quantity_estimate,
      latitude: r.latitude,
      longitude: r.longitude,
      predictionConfidence: r.prediction_confidence,
      status: r.status,
    }));

    // Calculate batch priorities
    const priorities = calculateBatchPriority(priorityInputs);

    // Build response with priority data attached
    let scoredReports = reports.map((r) => {
      const priority = priorities.get(r.id)!;
      return {
        ...r,
        priority,
      };
    });

    // Sort by priority score (highest first)
    scoredReports.sort((a, b) => b.priority.score - a.priority.score);

    // Apply tier filter
    if (tierFilter) {
      scoredReports = scoredReports.filter(
        (r) => r.priority.tier === tierFilter,
      );
    }

    // Summary counts
    const summary = {
      total: scoredReports.length,
      critical: scoredReports.filter((r) => r.priority.tier === "critical")
        .length,
      high: scoredReports.filter((r) => r.priority.tier === "high").length,
      medium: scoredReports.filter((r) => r.priority.tier === "medium").length,
      low: scoredReports.filter((r) => r.priority.tier === "low").length,
    };

    return NextResponse.json({
      success: true,
      reports: scoredReports,
      summary,
    });
  } catch (error: any) {
    console.error("Priority API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate priorities", message: error.message },
      { status: 500 },
    );
  }
}
