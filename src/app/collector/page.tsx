import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, Brain, Sparkles, Route } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RiskZonesWidget } from "@/components/dashboard/risk-zones-widget";

export default async function CollectorDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch pending reports (available for pickup)
  const { data: pendingReports } = await supabase
    .from("waste_reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true }) // Oldest first
    .limit(5);

  // Fetch priority risk zones
  const { data: riskZones } = await supabase
    .from("area_risk_zones")
    .select("*")
    .in("risk_level", ["critical", "high"])
    .order("risk_score", { ascending: false })
    .limit(3);

  // Fetch my assigned jobs
  const { data: myJobs } = await supabase
    .from("waste_reports")
    .select("*")
    .in("status", ["assigned", "in_progress"])
    .eq("assigned_to", user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Collector Dashboard
        </h2>
        <Button asChild>
          <Link href="/collector/map">
            <MapPin className="mr-2 h-4 w-4" />
            View Map
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              My Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myJobs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingReports?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Route Optimizer CTA */}
      <Card className="relative overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/10">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <CardContent className="relative py-5 px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">
                    AI Smart Route Optimizer
                  </h3>
                  <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Let AI find the fastest collection route through all pickups
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 shadow-md gap-1.5"
            >
              <Link href="/collector/routes">
                <Route className="h-4 w-4" />
                Optimize Route
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Priority Risk Zones */}
      <RiskZonesWidget
        zones={riskZones || []}
        role="collector"
        viewAllHref="/collector/map"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Jobs Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {myJobs?.length === 0 ? (
              <p className="text-muted-foreground">
                No active jobs. Claim some from the queue!
              </p>
            ) : (
              <div className="space-y-4">
                {myJobs?.map((job) => (
                  <div
                    key={job.id}
                    className="border p-3 rounded-lg flex justify-between items-center bg-muted/20"
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className="capitalize">
                          {job.confirmed_class || "Waste"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200"
                        >
                          {job.status === "in_progress"
                            ? "Picked Up"
                            : "Assigned"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {job.address_text}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/collector/jobs/${job.id}`}>Update</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Jobs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Pickup Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingReports?.length === 0 ? (
                <p className="text-muted-foreground">
                  No pending requests in your area.
                </p>
              ) : (
                pendingReports?.map((report) => (
                  <div
                    key={report.id}
                    className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="font-medium capitalize flex items-center gap-2">
                        {report.confirmed_class}
                        <span className="text-xs text-muted-foreground font-normal">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {report.address_text}
                      </p>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        const { revalidatePath } = await import("next/cache");
                        const sb = await createClient();
                        const {
                          data: { user: currentUser },
                        } = await sb.auth.getUser();
                        if (!currentUser) return;

                        // Generate idempotency key
                        const idempotencyKey = `claim-${report.id}-${currentUser.id}-${Date.now()}`;

                        // Call atomic RPC function to claim with correct parameter names
                        await sb.rpc("claim_report", {
                          p_report_id: report.id,
                          p_collector_id: currentUser.id,
                          p_idempotency_key: idempotencyKey,
                        });
                        revalidatePath("/collector");
                      }}
                    >
                      <Button size="sm">Claim</Button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
