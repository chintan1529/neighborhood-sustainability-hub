import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Tag,
  ShoppingBag,
  Truck,
  IndianRupee,
  Star,
  ShieldCheck,
  ArrowRight,
  Clock,
  Store,
} from "lucide-react";

export default async function RecyclerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  // Check recycler profile
  const { data: recyclerProfile } = await (supabase as any)
    .from("recycler_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!recyclerProfile) {
    redirect("/recycler/verification");
  }

  if (recyclerProfile.verification_status === "pending") {
    redirect("/recycler/verification");
  }

  // Fetch dashboard stats
  const { data: stats } = await (supabase as any)
    .from("recycler_analytics_summary")
    .select("*")
    .eq("recycler_id", user.id)
    .single();

  // Fetch recent offers
  const { data: recentOffers } = await (supabase as any)
    .from("marketplace_offers")
    .select(
      `
            id, price_offered, status, created_at,
            listing:marketplace_listings(title, category, weight_kg)
        `,
    )
    .eq("recycler_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch pending pickups
  const { data: pendingPickups } = await (supabase as any)
    .from("marketplace_transactions")
    .select(
      `
            id, scheduled_pickup_time, status, total_estimated_price,
            listing:marketplace_listings(title, category, address_text)
        `,
    )
    .eq("recycler_id", user.id)
    .in("status", ["confirmed", "picked_up"])
    .order("scheduled_pickup_time", { ascending: true })
    .limit(5);

  const kpis = [
    {
      label: "Active Offers",
      value: stats?.pending_offers || 0,
      icon: Tag,
    },
    {
      label: "Accepted Deals",
      value: stats?.accepted_offers || 0,
      icon: ShoppingBag,
    },
    {
      label: "Completed Pickups",
      value: stats?.completed_transactions || 0,
      icon: Truck,
    },
    {
      label: "Monthly Earnings",
      value: `₹${Math.round(stats?.monthly_earnings || 0).toLocaleString()}`,
      icon: IndianRupee,
    },
    {
      label: "Avg Rating",
      value: `${(stats?.total_rating || 0).toFixed(1)} ★`,
      icon: Star,
    },
    {
      label: "Trust Score",
      value: `${stats?.trust_score || 0}/100`,
      icon: ShieldCheck,
    },
  ];

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="secondary" className="text-[11px]">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recycler Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back,{" "}
            <span className="font-medium text-foreground">
              {recyclerProfile.business_name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recyclerProfile.verification_status === "approved" && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
          <Button asChild>
            <Link href="/recycler/marketplace">
              <Store className="mr-2 h-4 w-4" />
              Marketplace
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Offers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Recent Offers
              </CardTitle>
              <CardDescription className="mt-1">Your latest marketplace bids</CardDescription>
            </div>
            <Link
              href="/recycler/offers"
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-150"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentOffers?.length ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No offers yet</p>
                <Link
                  href="/recycler/marketplace"
                  className="text-xs font-medium text-foreground hover:underline"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between rounded-lg p-3 border border-border hover:bg-muted/50 transition-colors duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {offer.listing?.title || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {offer.listing?.category} · {offer.listing?.weight_kg}kg
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-sm tabular-nums">
                        ₹{offer.price_offered}/kg
                      </p>
                      {getStatusBadge(offer.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Pickups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                Upcoming Pickups
              </CardTitle>
              <CardDescription className="mt-1">
                Scheduled collections awaiting you
              </CardDescription>
            </div>
            <Link
              href="/recycler/pickups"
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-150"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!pendingPickups?.length ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No pending pickups</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingPickups.map((pickup: any) => (
                  <div
                    key={pickup.id}
                    className="rounded-lg p-3 border border-border hover:bg-muted/50 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-sm truncate">
                        {pickup.listing?.title || "Unknown"}
                      </p>
                      {getStatusBadge(pickup.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(
                          pickup.scheduled_pickup_time,
                        ).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        ₹{Math.round(pickup.total_estimated_price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
