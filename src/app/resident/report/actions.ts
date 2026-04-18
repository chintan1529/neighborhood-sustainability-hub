"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAndAwardBadges } from "@/lib/badges/badge-checker";
import { verifyPredictionForReport } from "@/lib/predictive-engine";

// Admin client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SubmitReportData {
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  photoBase64: string;
  photoName: string;
}

export async function submitReport(data: SubmitReportData) {
  try {
    // Get current user from session
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // 1. Get or create neighborhood assignment for user
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("neighborhood_id, total_points, reports_count")
      .eq("id", user.id)
      .single();

    let neighborhoodId = profile?.neighborhood_id;

    if (!neighborhoodId) {
      // Get first active neighborhood
      const { data: neighborhoods } = await supabaseAdmin
        .from("neighborhoods")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (neighborhoods) {
        neighborhoodId = neighborhoods.id;

        // Update user profile
        await supabaseAdmin
          .from("profiles")
          .update({ neighborhood_id: neighborhoodId })
          .eq("id", user.id);
      } else {
        return {
          success: false,
          error: "No neighborhoods available. Please contact admin.",
        };
      }
    }

    // 2. Upload photo (decode base64)
    const photoBuffer = Buffer.from(data.photoBase64, "base64");
    const filePath = `${user.id}/${data.category}-${Date.now()}-${data.photoName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("report-photos")
      .upload(filePath, photoBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // 3. Insert report record
    const { data: insertedReport, error: dbError } = await supabaseAdmin
      .from("waste_reports")
      .insert({
        user_id: user.id,
        neighborhood_id: neighborhoodId,
        status: "pending",
        predicted_class: data.category,
        confirmed_class: data.category,
        prediction_confidence: 1.0,
        latitude: data.latitude,
        longitude: data.longitude,
        address_text: data.address || "Pinned Location",
        photo_url: filePath,
        notes: data.notes || null,
      })
      .select(
        "id, latitude, longitude, created_at, confirmed_class, predicted_class",
      )
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return { success: false, error: `Database error: ${dbError.message}` };
    }

    // 4. Award points to user
    await supabaseAdmin
      .from("profiles")
      .update({
        total_points: (profile?.total_points || 0) + 10,
        reports_count: (profile?.reports_count || 0) + 1,
      })
      .eq("id", user.id);

    // 5. Closed-loop AI feedback: verify any matching predicted hotspot
    try {
      if (insertedReport) {
        await verifyPredictionForReport(insertedReport);
      }
    } catch (loopErr) {
      console.error("Feedback loop failed:", loopErr);
    }

    // 6. Evaluate and award badges
    const unlockedBadges = await checkAndAwardBadges(user.id);

    revalidatePath("/resident");
    return { success: true, unlockedBadges };
  } catch (error: any) {
    console.error("Submit report error:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}
