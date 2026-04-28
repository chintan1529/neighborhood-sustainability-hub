import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { redirect } from "next/navigation";

export default async function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "collector" && profile?.role !== "admin") {
    redirect("/resident");
  }

  const userData = {
    full_name: profile.full_name,
    email: user.email!,
    avatar_url: profile.avatar_url,
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <div className="hidden border-r border-border bg-card md:block md:w-60 lg:w-64 shrink-0">
        <Sidebar role="collector" className="h-screen sticky top-0" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header role="collector" user={userData} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
