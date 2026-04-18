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
    // Basic role protection (middleware handles this too, but doublesure)
    redirect("/");
  }

  const userData = {
    full_name: profile.full_name,
    email: user.email!,
    avatar_url: profile.avatar_url,
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72">
        <div className="flex h-full flex-col gap-2">
          <Sidebar role="resident" className="flex-1" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header role="resident" user={userData} />
        <main className="flex-1 space-y-4 p-8 pt-6">{children}</main>
      </div>

      <RealtimeNotifications userId={user.id} />
    </div>
  );
}
