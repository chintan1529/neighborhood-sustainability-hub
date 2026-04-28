import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { ActiveChallenges } from "@/components/dashboard/active-challenges";
import { WasteInsightCard } from "@/components/dashboard/waste-insight-card";
import { MarketplaceWidget } from "@/components/dashboard/marketplace-widget";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function ResidentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch Profile Stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points, current_streak, reports_count, full_name")
    .eq("id", user.id)
    .single();

  // 2. Fetch Rank (from view)
  const { data: rankData } = await supabase
    .from("leaderboard_view")
    .select("rank")
    .eq("user_id", user.id)
    .single();

  const rank = rankData?.rank || 0;

  // 3. Fetch Recent Reports
  const { data: reports } = await supabase
    .from("waste_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 3.5. Fetch Marketplace Listings
  const { data: marketplaceListings } = await supabase
    .from("marketplace_listings")
    .select(
      `
            id,
            title,
            category,
            weight_kg,
            status,
            offers:marketplace_offers!marketplace_offers_listing_id_fkey(status)
        `,
    )
    .eq("resident_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // 4. Fetch Active Challenges with Participation
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "active")
    .limit(3);

  let challengesWithParticipation: any[] = [];
  if (challenges && challenges.length > 0) {
    const challengeIds = challenges.map((c) => c.id);
    const { data: participations } = await supabase
      .from("challenge_participants")
      .select("*")
      .eq("user_id", user.id)
      .in("challenge_id", challengeIds);

    challengesWithParticipation = challenges.map((c) => ({
      ...c,
      participation:
        participations?.find((p) => p.challenge_id === c.id) || null,
    }));
  }

  const stats = {
    totalPoints: profile?.total_points || 0,
    currentStreak: profile?.current_streak || 0,
    reportsCount: profile?.reports_count || 0,
    rank,
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening in your neighborhood today.
          </p>
        </div>
        <Button asChild size="default">
          <Link href="/resident/report/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Report Waste
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* AI Waste Insights */}
      <WasteInsightCard />

      {/* Bottom Grid: Reports + Challenges */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-4">
          <RecentReports reports={reports || []} />
        </div>
        <div className="col-span-full lg:col-span-3 space-y-6">
          <MarketplaceWidget listings={marketplaceListings || []} />
          <ActiveChallenges challenges={challengesWithParticipation} />
        </div>
      </div>
    </div>
  );
}
