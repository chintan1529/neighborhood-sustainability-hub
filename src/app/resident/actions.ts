"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Admin client that bypasses RLS for critical updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function submitCollectorReview(
  reportId: string,
  rating: number,
  review: string,
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the user owns this report and it is completed
    const { data: reportData, error: verifyError } = await supabase
      .from("waste_reports")
      .select("id, status, collector_rating")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    const report = reportData as {
      id: string;
      status: string;
      collector_rating: number | null;
    } | null;

    if (verifyError || !report) {
      return { success: false, error: "Report not found or not owned by you." };
    }

    if (report.status !== "completed") {
      return {
        success: false,
        error: "You can only review completed reports.",
      };
    }

    if (report.collector_rating) {
      return {
        success: false,
        error: "You have already rated this collector.",
      };
    }

    // Update the report with the rating and review
    const { error: updateError } = await supabaseAdmin
      .from("waste_reports")
      .update({
        collector_rating: rating,
        collector_review: review || null,
      })
      .eq("id", reportId);

    if (updateError) {
      console.error("Update review error:", updateError);
      return {
        success: false,
        error: `Database error: ${updateError.message}`,
      };
    }

    revalidatePath("/resident");
    revalidatePath("/resident/reports");

    return { success: true };
  } catch (error: any) {
    console.error("Submit review error:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}
