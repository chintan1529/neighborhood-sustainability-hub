import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { redirect } from "next/navigation";
import { RealtimeNotifications } from "@/components/ui/realtime-notifications";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch full profile for avatar/name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "resident") {
    redirect("/");
  }

  const userData = {
    full_name: profile.full_name,
    email: user.email!,
    avatar_url: profile.avatar_url,
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden border-r border-border bg-card md:block md:w-60 lg:w-64 shrink-0">
        <Sidebar role="resident" className="h-screen sticky top-0" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header role="resident" user={userData} />
        <main className="flex-1 p-6">{children}</main>
      </div>

      <RealtimeNotifications userId={user.id} />
    </div>
  );
}
