import { getMarketplaceFeed } from "@/app/actions/marketplace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert, Clock } from "lucide-react";
import RecyclerView from "./recycler-view";
import OnboardingWizard from "./onboarding-wizard";

export default async function RecyclerMarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  const { data: profile } = await (supabase as any)
    .from("recycler_profiles")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.verification_status) {
    return <OnboardingWizard />;
  }

  if (profile.verification_status === "pending") {
    return (
      <div className="container max-w-2xl py-24 text-center animate-in fade-in duration-500">
        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Application Under Review
        </h2>
        <p className="text-muted-foreground">
          Your request to join the marketplace is being reviewed by the
          administration. We will notify you once you&apos;re approved.
        </p>
      </div>
    );
  }

  if (profile.verification_status !== "approved") {
    return (
      <div className="container max-w-4xl py-12">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6 flex items-start gap-4 text-red-800 dark:text-red-200">
          <ShieldAlert className="h-6 w-6 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-1">Access Suspended</h3>
            <p>
              Your recycler profile is currently {profile.verification_status}.
              Contact support for more information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const feedResponse = await getMarketplaceFeed({});

  const sortedListings = (feedResponse.listings || []).sort(
    (a: any, b: any) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    },
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-muted/10 overflow-hidden -m-8 -mt-6">
      <RecyclerView initialListings={sortedListings} currentUserId={user.id} />
    </div>
  );
}
