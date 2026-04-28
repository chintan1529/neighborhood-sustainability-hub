import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, Route } from "lucide-react";
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
    .order("created_at", { ascending: true })
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Collector Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your collection queue and routes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/collector/routes">
              <Route className="mr-2 h-4 w-4" />
              Smart Routes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/collector/map">
              <MapPin className="mr-2 h-4 w-4" />
              View Map
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              My Active Jobs
            </p>
            <p className="text-2xl font-semibold tabular-nums">{myJobs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Pending Requests
            </p>
            <p className="text-2xl font-semibold tabular-nums">{pendingReports?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

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
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-1">No active jobs</p>
                <p className="text-xs text-muted-foreground">Claim some from the queue to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myJobs?.map((job) => (
                  <div
                    key={job.id}
                    className="border border-border p-3 rounded-lg flex justify-between items-center hover:bg-muted/50 transition-colors duration-150"
                  >
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <span className="capitalize">
                          {job.confirmed_class || "Waste"}
                        </span>
                        <Badge variant="secondary" className="text-[11px]">
                          {job.status === "in_progress"
                            ? "Picked Up"
                            : "Assigned"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
                        {job.address_text}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
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
            <div className="space-y-2">
              {pendingReports?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-1">No pending requests</p>
                  <p className="text-xs text-muted-foreground">Check back later for new pickups.</p>
                </div>
              ) : (
                pendingReports?.map((report) => (
                  <div
                    key={report.id}
                    className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm capitalize flex items-center gap-2">
                        {report.confirmed_class}
                        <span className="text-xs text-muted-foreground font-normal">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
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

                        const idempotencyKey = `claim-${report.id}-${currentUser.id}-${Date.now()}`;

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
