"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function joinChallenge(formData: FormData) {
  const challengeId = formData.get("challengeId") as string;

  if (!challengeId) {
    return { error: "Challenge ID is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Already enrolled - just refresh and show enrolled status
    revalidatePath("/resident/challenges");
    redirect("/resident/challenges");
  }

  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: user.id,
    current_count: 0,
    is_completed: false,
    points_awarded: 0,
    badge_awarded: false,
  });

  if (error) {
    console.error("Join challenge error:", error);
    // Still redirect on duplicate key error (race condition)
    if (error.code === "23505") {
      revalidatePath("/resident/challenges");
      redirect("/resident/challenges");
    }
    return { error: error.message };
  }

  revalidatePath("/resident/challenges");
  revalidatePath("/resident");
  redirect("/resident/challenges");
}
