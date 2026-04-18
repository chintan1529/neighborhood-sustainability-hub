import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ComplaintsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: complaints } = await supabase
    .from("complaints")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ComplaintsClient complaints={complaints || []} />;
}
