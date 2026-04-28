import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/admin/analytics-charts";
import { RunPredictionButton } from "@/components/admin/run-prediction-button";
import { getPredictionSummary } from "@/lib/predictive-engine";
import { RiskZonesWidget } from "@/components/dashboard/risk-zones-widget";

export const dynamic = "force-dynamic";

const CATEGORY_COLORS: Record<string, string> = {
  plastic: "#3B82F6",
  organic: "#10B981",
  metal: "#6366F1",
  paper: "#F59E0B",
  cardboard: "#F97316",
  glass: "#06B6D4",
  mixed: "#8B5CF6",
  hazardous: "#EF4444",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const predictionSummary = await getPredictionSummary();

  // ── KPI Queries (parallel) ──
  const [
    { count: totalReports },
    { count: completedReports },
    { count: pendingReports },
    { count: totalUsers },
    { count: totalCollectors },
  ] = await Promise.all([
    admin.from("waste_reports").select("*", { count: "exact", head: true }),
    admin
      .from("waste_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    admin
      .from("waste_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "resident"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "collector"),
  ]);

  // ── Fetch Priority Risk Zones ──
  const { data: riskZones } = await admin
    .from("area_risk_zones")
    .select("*")
    .in("risk_level", ["critical", "high"])
    .order("risk_score", { ascending: false })
    .limit(3);

  // ── Avg completion hours ──
  const { data: completedData } = await admin
    .from("waste_reports")
    .select("created_at, completed_at")
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(100);

  let avgCompletionHours = 0;
  let slaComplianceRate = 0;
  if (completedData && completedData.length > 0) {
    const hours = completedData.map((r: any) => {
      const diff =
        new Date(r.completed_at).getTime() - new Date(r.created_at).getTime();
      return diff / (1000 * 60 * 60);
    });
    avgCompletionHours =
      Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
    const withinSla = hours.filter((h) => h <= 24).length;
    slaComplianceRate = Math.round((withinSla / hours.length) * 100);
  }

  // ── Weekly trend ──
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [{ count: reportsThisWeek }, { count: reportsLastWeek }] =
    await Promise.all([
      admin
        .from("waste_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString()),
      admin
        .from("waste_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", oneWeekAgo.toISOString()),
    ]);

  // ── Collector ratings ──
  const { data: ratedReports } = await admin
    .from("waste_reports")
    .select("collector_rating")
    .not("collector_rating", "is", null);

  let avgCollectorRating = 0;
  const totalReviews = ratedReports?.length || 0;
  if (ratedReports && ratedReports.length > 0) {
    avgCollectorRating =
      ratedReports.reduce((a, r: any) => a + r.collector_rating, 0) /
      ratedReports.length;
  }

  // ── 7-Day Activity ──
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data: weekReports } = await admin
    .from("waste_reports")
    .select("created_at, status, completed_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyMap: Record<string, { reports: number; completed: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${dayNames[d.getDay()]} ${d.getDate()}`;
    dailyMap[key] = { reports: 0, completed: 0 };
  }

  (weekReports || []).forEach((r: any) => {
    const d = new Date(r.created_at);
    const key = `${dayNames[d.getDay()]} ${d.getDate()}`;
    if (dailyMap[key]) {
      dailyMap[key].reports++;
      if (r.status === "completed") dailyMap[key].completed++;
    }
  });

  const dailyActivity = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    reports: data.reports,
    completed: data.completed,
  }));

  // ── Category Distribution ──
  const { data: allReports } = await admin
    .from("waste_reports")
    .select("confirmed_class, predicted_class")
    .neq("status", "cancelled");

  const catMap: Record<string, number> = {};
  (allReports || []).forEach((r: any) => {
    const cat = r.confirmed_class || r.predicted_class || "mixed";
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const categoryDistribution = Object.entries(catMap)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#9CA3AF",
    }))
    .sort((a, b) => b.value - a.value);

  // ── Collector Leaderboard ──
  const { data: collectors } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "collector");

  let collectorLeaderboard: any[] = [];
  if (collectors && collectors.length > 0) {
    const collectorIds = collectors.map((c: any) => c.id);
    const { data: collectorReports } = await admin
      .from("waste_reports")
      .select("assigned_to, created_at, completed_at, collector_rating")
      .eq("status", "completed")
      .in("assigned_to", collectorIds);

    const collectorStats: Record<
      string,
      { jobs: number; totalH: number; totalRating: number; ratingCount: number }
    > = {};
    (collectorReports || []).forEach((r: any) => {
      if (!r.assigned_to) return;
      if (!collectorStats[r.assigned_to]) {
        collectorStats[r.assigned_to] = {
          jobs: 0,
          totalH: 0,
          totalRating: 0,
          ratingCount: 0,
        };
      }
      const s = collectorStats[r.assigned_to];
      s.jobs++;
      if (r.completed_at && r.created_at) {
        s.totalH +=
          (new Date(r.completed_at).getTime() -
            new Date(r.created_at).getTime()) /
          (1000 * 60 * 60);
      }
      if (r.collector_rating) {
        s.totalRating += r.collector_rating;
        s.ratingCount++;
      }
    });

    collectorLeaderboard = collectors
      .map((c: any) => {
        const s = collectorStats[c.id] || {
          jobs: 0,
          totalH: 0,
          totalRating: 0,
          ratingCount: 0,
        };
        return {
          name: c.full_name || "Unknown",
          completedJobs: s.jobs,
          avgRating:
            s.ratingCount > 0
              ? Math.round((s.totalRating / s.ratingCount) * 10) / 10
              : 0,
          avgHours: s.jobs > 0 ? Math.round((s.totalH / s.jobs) * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.completedJobs - a.completedJobs)
      .slice(0, 5);
  }

  // ── Resolution rate ──
  const resolutionRate =
    (totalReports || 0) > 0
      ? Math.round(((completedReports || 0) / (totalReports || 1)) * 100)
      : 0;

  const { data: routeRuns } = await (admin as any)
    .from("route_run_metrics")
    .select("distance_saved_km, naive_distance_km")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: thresholds } = await (admin as any)
    .from("prediction_thresholds")
    .select("threshold");

  const paiHistory = ((predictionSummary.metrics as any).paiHistory || [])
    .map((row: any) => ({
      label: new Date(row.cycle_ended_at).toLocaleDateString(),
      pai: Number(row.pai || 0),
      threshold: Number(row.threshold_after || row.threshold_before || 0),
    }))
    .reverse();

  const routeEfficiencyGain =
    (routeRuns || []).length > 0
      ? (routeRuns || []).reduce((sum: number, row: any) => {
          const naive = Number(row.naive_distance_km || 0);
          const saved = Number(row.distance_saved_km || 0);
          return sum + (naive > 0 ? (saved / naive) * 100 : 0);
        }, 0) / (routeRuns || []).length
      : 0;

  const typedThresholds = (thresholds || []) as Array<{ threshold: number }>;
  const feedbackMetrics = {
    globalPai: Number((predictionSummary.metrics as any).accuracy ?? 0) / 100,
    avgThreshold:
      typedThresholds.length > 0
        ? typedThresholds.reduce((sum, row) => sum + row.threshold, 0) /
          typedThresholds.length
        : 0.65,
    verifiedPredictions: Number(
      (predictionSummary.metrics as any).verified ?? 0,
    ),
    missedPredictions: Number((predictionSummary.metrics as any).missed ?? 0),
    routeEfficiencyGain,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational overview
          </p>
        </div>
        <RunPredictionButton />
      </div>

      <AnalyticsDashboard
        kpis={{
          totalReports: totalReports || 0,
          completedReports: completedReports || 0,
          pendingReports: pendingReports || 0,
          totalUsers: totalUsers || 0,
          totalCollectors: totalCollectors || 0,
          resolutionRate,
          avgCompletionHours,
          slaComplianceRate,
          reportsThisWeek: reportsThisWeek || 0,
          reportsLastWeek: reportsLastWeek || 0,
          avgCollectorRating,
          totalReviews,
        }}
        dailyActivity={dailyActivity}
        categoryDistribution={categoryDistribution}
        collectorLeaderboard={collectorLeaderboard}
        feedbackMetrics={feedbackMetrics}
        paiHistory={paiHistory}
      />

      {/* Priority Risk Zones */}
      <RiskZonesWidget
        zones={riskZones || []}
        role="admin"
        viewAllHref="/admin/intelligence"
      />
    </div>
  );
}
