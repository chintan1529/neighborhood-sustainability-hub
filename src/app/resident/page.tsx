import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { ActiveChallenges } from "@/components/dashboard/active-challenges";
import { WasteInsightCard } from "@/components/dashboard/waste-insight-card";
import { MarketplaceWidget } from "@/components/dashboard/marketplace-widget";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Trophy,
  MapPin,
  ArrowRight,
  Sparkles,
  Leaf,
  Zap,
} from "lucide-react";
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

  const quickActions = [
    {
      href: "/resident/reports",
      icon: MapPin,
      label: "My Reports",
      description: "Track your waste reports",
      gradient: "from-emerald-500 to-teal-600",
      shadow: "hover:shadow-emerald-500/20",
    },
    {
      href: "/resident/challenges",
      icon: Trophy,
      label: "Challenges",
      description: "Compete & earn points",
      gradient: "from-amber-500 to-orange-600",
      shadow: "hover:shadow-amber-500/20",
    },
    {
      href: "/resident/eco-guide",
      icon: Leaf,
      label: "Eco Guide",
      description: "AI-powered waste tips",
      gradient: "from-green-500 to-emerald-600",
      shadow: "hover:shadow-green-500/20",
    },
    {
      href: "/resident/impact",
      icon: Zap,
      label: "My Impact",
      description: "See your contribution",
      gradient: "from-blue-500 to-indigo-600",
      shadow: "hover:shadow-blue-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Hero Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-2xl gradient-mesh border border-border/40 p-8 md:p-10 animate-fade-in">
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Dashboard
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text">
              {greeting}, {firstName} 👋
            </h2>
            <p className="text-muted-foreground text-base max-w-md leading-relaxed">
              Here&apos;s what&apos;s happening in your neighborhood today. Keep
              making an impact!
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-xl px-6 h-12 text-sm font-semibold glow-green"
          >
            <Link href="/resident/report/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              Report Waste
            </Link>
          </Button>
        </div>

        {/* Shimmer line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px shimmer-line" />
      </div>

      {/* ── Quick Actions Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group relative glass rounded-xl p-5 hover:shadow-lg ${action.shadow} transition-all duration-300 hover:-translate-y-1 animate-slide-up delay-${i + 1}`}
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3.5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-0.5">{action.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.description}
              </p>
              <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-300" />
            </Link>
          );
        })}
      </div>

      {/* ── Stats Cards ── */}
      <div className="animate-slide-up delay-5">
        <StatsCards stats={stats} />
      </div>

      {/* ── AI Waste Insights ── */}
      <div className="animate-slide-up delay-5">
        <WasteInsightCard />
      </div>

      {/* ── Bottom Grid: Reports + Challenges ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-slide-up delay-6">
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
