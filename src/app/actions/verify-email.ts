"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6, "OTP must be 6 digits"),
});

export async function verifyEmailOtp(data: {
  email: string;
  token: string;
}) {
  const parsed = verifyOtpSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { data: verifyData, error } = await supabase.auth.verifyOtp({
    email: data.email,
    token: data.token,
    type: "signup",
  });

  if (error) {
    return { error: error.message };
  }

  if (!verifyData.user) {
    return { error: "Verification failed. Please try again." };
  }

  // Get the user's role to determine redirect
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", verifyData.user.id)
    .single();

  const typedProfile = profile as { role?: string } | null;

  const redirectPath =
    typedProfile?.role === "collector"
      ? "/collector"
      : typedProfile?.role === "recycler"
        ? "/recycler"
        : typedProfile?.role === "admin"
          ? "/admin"
          : "/resident";

  revalidatePath("/", "layout");
  return { success: true, redirectUrl: redirectPath };
}

export async function resendOtp(email: string) {
  if (!email || !z.string().email().safeParse(email).success) {
    return { error: "Invalid email address" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
