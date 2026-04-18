import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatePredictions,
  getPredictionGeoJson,
  getPredictionSummary,
} from "@/lib/predictive-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "geojson") {
      return NextResponse.json(await getPredictionGeoJson());
    }

    return NextResponse.json(await getPredictionSummary());
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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

    if (!typedProfile || typedProfile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const generated = await generatePredictions({
      neighborhoodId: typedProfile.neighborhood_id,
    });

    return NextResponse.json({
      success: true,
      ...generated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
