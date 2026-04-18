import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePredictions } from "@/lib/predictive-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, neighborhood_id")
      .eq("id", user.id)
      .single();
    const typedProfile = profile as {
      role?: string;
      neighborhood_id?: string | null;
    } | null;

    if (
      !typedProfile ||
      !["admin", "collector"].includes(typedProfile.role || "")
    ) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const result = await generatePredictions({
      neighborhoodId: typedProfile.neighborhood_id,
    });

    return NextResponse.json({
      success: true,
      predictions: result.predictions,
      source: result.source,
      threshold: result.threshold,
      filteredOut: result.filteredOut,
      message: `Generated ${result.predictions.length} predictive hotspots`,
    });
  } catch (error: any) {
    console.error("Predictive waste pipeline error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate predictions",
      },
      { status: 500 },
    );
  }
}
