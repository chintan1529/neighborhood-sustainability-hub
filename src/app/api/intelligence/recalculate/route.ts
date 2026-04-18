import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeAllRiskScores } from "@/lib/risk-scoring-engine";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const result = await computeAllRiskScores();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Risk recalculation failed:", error);
    return NextResponse.json(
      { error: error.message || "Recalculation failed" },
      { status: 500 },
    );
  }
}
