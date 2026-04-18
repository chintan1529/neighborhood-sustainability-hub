import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { redirect } from "next/navigation";

export default async function RecyclerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "recycler" && profile?.role !== "admin") {
    redirect("/resident");
  }

  const userData = {
    full_name: profile.full_name,
    email: user.email!,
    avatar_url: profile.avatar_url,
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72">
        <div className="flex h-full flex-col gap-2">
          <Sidebar role="recycler" className="flex-1" />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <Header role="recycler" user={userData} />
        <main className="flex-1 space-y-4 p-8 pt-6">{children}</main>
      </div>
    </div>
  );
}
