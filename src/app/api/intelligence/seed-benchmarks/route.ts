import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedGovernmentBenchmarks } from "@/lib/seed-government-data";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const result = await seedGovernmentBenchmarks();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Benchmark seeding failed:", error);
    return NextResponse.json(
      { error: error.message || "Seeding failed" },
      { status: 500 },
    );
  }
}
