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
import Link from "next/link";
import {
  Tag,
  ShoppingBag,
  Truck,
  IndianRupee,
  Star,
  ShieldCheck,
  TrendingUp,
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
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Accepted Deals",
      value: stats?.accepted_offers || 0,
      icon: ShoppingBag,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Completed Pickups",
      value: stats?.completed_transactions || 0,
      icon: Truck,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Monthly Earnings",
      value: `₹${Math.round(stats?.monthly_earnings || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Avg Rating",
      value: `${(stats?.total_rating || 0).toFixed(1)} ★`,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      label: "Trust Score",
      value: `${stats?.trust_score || 0}/100`,
      icon: ShieldCheck,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "picked_up":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Recycler Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">
              {recyclerProfile.business_name}
            </span>
          </p>
        </div>
        <Badge
          variant="outline"
          className={`px-3 py-1 text-sm ${recyclerProfile.verification_status === "approved" ? "border-green-300 bg-green-50 text-green-700" : "border-yellow-300 bg-yellow-50 text-yellow-700"}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          {recyclerProfile.verification_status === "approved"
            ? "Verified"
            : recyclerProfile.verification_status}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="hover:shadow-lg transition-shadow duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center`}
                >
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Offers */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" /> Recent Offers
              </CardTitle>
              <CardDescription>Your latest marketplace bids</CardDescription>
            </div>
            <Link
              href="/recycler/offers"
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentOffers?.length ? (
              <div className="text-center py-8">
                <Store className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No offers yet</p>
                <Link
                  href="/recycler/marketplace"
                  className="text-sm text-primary font-semibold mt-2 inline-block"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border"
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
                      <p className="font-bold text-green-600">
                        ₹{offer.price_offered}/kg
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getStatusColor(offer.status)}`}
                      >
                        {offer.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Pickups */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" /> Upcoming Pickups
              </CardTitle>
              <CardDescription>
                Scheduled collections awaiting you
              </CardDescription>
            </div>
            <Link
              href="/recycler/pickups"
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!pendingPickups?.length ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No pending pickups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPickups.map((pickup: any) => (
                  <div
                    key={pickup.id}
                    className="bg-muted/30 rounded-lg p-3 border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">
                        {pickup.listing?.title || "Unknown"}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getStatusColor(pickup.status)}`}
                      >
                        {pickup.status}
                      </Badge>
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
                      <span className="font-bold text-foreground">
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

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 border-teal-200 dark:border-teal-900">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-teal-600" />
            <div>
              <p className="font-bold text-lg">Find New Opportunities</p>
              <p className="text-sm text-muted-foreground">
                Browse nearby recyclable waste listings
              </p>
            </div>
          </div>
          <Link href="/recycler/marketplace">
            <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg shadow-teal-500/20 transition-colors">
              Open Marketplace
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
