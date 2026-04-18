import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminComplaintsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminComplaintsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Fetch all complaints with user info
  const { data: complaints } = await admin
    .from("complaints")
    .select(
      `
            *,
            profiles:user_id ( full_name, avatar_url, role ),
            assigned_profile:assigned_to ( full_name )
        `,
    )
    .order("created_at", { ascending: false });

  // Fetch admin users for assignment
  const { data: admins } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin");

  return (
    <AdminComplaintsClient
      complaints={(complaints as any) || []}
      admins={(admins as any) || []}
    />
  );
}
