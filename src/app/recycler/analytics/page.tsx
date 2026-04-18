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
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Star,
  IndianRupee,
  Tag,
  Target,
} from "lucide-react";

export default async function RecyclerAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login/recycler");

  // Fetch comprehensive stats
  const { data: stats } = await (supabase as any)
    .from("recycler_analytics_summary")
    .select("*")
    .eq("recycler_id", user.id)
    .single();

  // Fetch category breakdown from completed transactions
  const { data: categoryBreakdown } = await (supabase as any)
    .from("marketplace_transactions")
    .select("listing:marketplace_listings(category), total_estimated_price")
    .eq("recycler_id", user.id)
    .eq("status", "completed");

  // Aggregate by category
  const categoryStats: Record<string, { count: number; total: number }> = {};
  categoryBreakdown?.forEach((tx: any) => {
    const cat = tx.listing?.category || "unknown";
    if (!categoryStats[cat]) categoryStats[cat] = { count: 0, total: 0 };
    categoryStats[cat].count++;
    categoryStats[cat].total += tx.total_estimated_price || 0;
  });

  // Fetch recent reviews
  const { data: reviews } = await (supabase as any)
    .from("transaction_reviews")
    .select(
      "*, reviewer:profiles!transaction_reviews_reviewer_id_fkey(full_name)",
    )
    .eq("reviewee_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const completionRate = stats?.total_transactions
    ? Math.round(
        (stats.completed_transactions / stats.total_transactions) * 100,
      )
    : 0;

  const trustScoreColor =
    (stats?.trust_score || 0) >= 70
      ? "text-green-600"
      : (stats?.trust_score || 0) >= 40
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-teal-600" /> Analytics Dashboard
        </h2>
        <p className="text-muted-foreground">
          In-depth performance metrics for your recycling business.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 border-teal-200 dark:border-teal-900">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                Trust Score
              </p>
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            </div>
            <p className={`text-4xl font-bold ${trustScoreColor}`}>
              {stats?.trust_score || 0}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </p>
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-4xl font-bold">
              ₹{Math.round(stats?.total_earnings || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </p>
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-4xl font-bold">{completionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Avg Rating
              </p>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-4xl font-bold">
              {(stats?.total_rating || 0).toFixed(1)}{" "}
              <span className="text-lg text-muted-foreground">★</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-teal-600" /> Category Breakdown
            </CardTitle>
            <CardDescription>
              Earnings and volume by waste category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryStats).length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  No completed transactions yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(categoryStats)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cat, data]) => {
                    const maxTotal = Math.max(
                      ...Object.values(categoryStats).map((d) => d.total),
                    );
                    const percentage =
                      maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {cat}
                            </Badge>
                          </span>
                          <span className="text-sm">
                            <span className="font-bold text-teal-600">
                              ₹{Math.round(data.total).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({data.count} deals)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div
                            className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> Recent Reviews
            </CardTitle>
            <CardDescription>
              What residents are saying about you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!reviews?.length ? (
              <div className="text-center py-8">
                <Star className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-muted/20 border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">
                        {review.reviewer?.full_name || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" /> Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg border">
              <p className="text-3xl font-bold">{stats?.total_offers || 0}</p>
              <p className="text-sm text-muted-foreground">Total Offers Made</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg border">
              <p className="text-3xl font-bold">
                {stats?.accepted_offers || 0}
              </p>
              <p className="text-sm text-muted-foreground">Offers Accepted</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg border">
              <p className="text-3xl font-bold">
                {stats?.completed_transactions || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed Pickups</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-950/20 dark:to-green-950/20 rounded-lg border border-teal-200 dark:border-teal-900">
              <p className="text-3xl font-bold text-teal-600">
                ₹{Math.round(stats?.monthly_earnings || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                This Month&apos;s Earnings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
