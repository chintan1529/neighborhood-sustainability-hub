"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  const validated = authSchema.safeParse({ email, password });
  if (!validated.success) {
    return { error: "Invalid input data" };
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
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

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("fullName");
  const role = formData.get("role") as string | null;

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  const validated = authSchema.safeParse({
    email,
    password,
    fullName: typeof fullName === "string" ? fullName : undefined,
  });
  if (!validated.success) {
    return { error: "Invalid input data" };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: typeof fullName === "string" ? fullName : undefined,
        role:
          role === "recycler"
            ? "recycler"
            : role === "collector"
              ? "collector"
              : "resident",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const redirectPath =
    role === "recycler"
      ? "/recycler"
      : role === "collector"
        ? "/collector"
        : "/resident";
  revalidatePath("/", "layout");
  return { success: true, redirectUrl: redirectPath };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
