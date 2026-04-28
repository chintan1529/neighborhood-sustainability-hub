"use client";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Star,
  AlertTriangle,
  Zap,
  Activity,
} from "lucide-react";

// ── Types ──
interface AnalyticsDashboardProps {
  kpis: {
    totalReports: number;
    completedReports: number;
    pendingReports: number;
    totalUsers: number;
    totalCollectors: number;
    resolutionRate: number;
    avgCompletionHours: number;
    slaComplianceRate: number;
    reportsThisWeek: number;
    reportsLastWeek: number;
    avgCollectorRating: number;
    totalReviews: number;
  };
  dailyActivity: { date: string; reports: number; completed: number }[];
  categoryDistribution: { name: string; value: number; color: string }[];
  collectorLeaderboard: {
    name: string;
    completedJobs: number;
    avgRating: number;
    avgHours: number;
  }[];
  feedbackMetrics?: {
    globalPai: number;
    avgThreshold: number;
    verifiedPredictions: number;
    missedPredictions: number;
    routeEfficiencyGain: number;
  };
  paiHistory?: { label: string; pai: number; threshold: number }[];
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: number;
  trendLabel?: string;
  gradient: string;
}) {
  const isPositive = trend && trend > 0;
  return (
    <Card className="relative overflow-hidden border border-border/50 hover:shadow-md transition-shadow">
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}
      />
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {trend !== undefined && (
          <div
            className={`mt-3 flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {trend}%
            </span>
            <span className="text-muted-foreground font-normal ml-1">
              {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p
          key={i}
          style={{ color: entry.color }}
          className="flex items-center gap-1.5"
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export function AnalyticsDashboard({
  kpis,
  dailyActivity,
  categoryDistribution,
  collectorLeaderboard,
  feedbackMetrics,
  paiHistory = [],
}: AnalyticsDashboardProps) {
  const weeklyTrend =
    kpis.reportsLastWeek > 0
      ? Math.round(
          ((kpis.reportsThisWeek - kpis.reportsLastWeek) /
            kpis.reportsLastWeek) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Reports"
          value={kpis.totalReports}
          subtitle={`${kpis.reportsThisWeek} this week`}
          icon={FileText}
          trend={weeklyTrend}
          trendLabel="vs last week"
          gradient="from-blue-500 to-indigo-600"
        />
        <KpiCard
          title="Resolution Rate"
          value={`${kpis.resolutionRate}%`}
          subtitle={`${kpis.completedReports} completed`}
          icon={CheckCircle}
          gradient="from-emerald-500 to-teal-600"
        />
        <KpiCard
          title="Avg Completion"
          value={`${kpis.avgCompletionHours}h`}
          subtitle="Average pickup time"
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
        />
        <KpiCard
          title="SLA Compliance"
          value={`${kpis.slaComplianceRate}%`}
          subtitle="Within 24h target"
          icon={kpis.slaComplianceRate >= 80 ? Zap : AlertTriangle}
          gradient={
            kpis.slaComplianceRate >= 80
              ? "from-violet-500 to-purple-600"
              : "from-red-500 to-rose-600"
          }
        />
      </div>

      {feedbackMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Global PAI"
            value={feedbackMetrics.globalPai.toFixed(3)}
            subtitle="Feedback accuracy index"
            icon={Activity}
            gradient="from-violet-500 to-fuchsia-600"
          />
          <KpiCard
            title="Avg Threshold"
            value={feedbackMetrics.avgThreshold.toFixed(2)}
            subtitle="Zone confidence gate"
            icon={Zap}
            gradient="from-cyan-500 to-sky-600"
          />
          <KpiCard
            title="Verified Predictions"
            value={feedbackMetrics.verifiedPredictions}
            subtitle="Closed-loop matches"
            icon={CheckCircle}
            gradient="from-emerald-500 to-green-600"
          />
          <KpiCard
            title="Missed Predictions"
            value={feedbackMetrics.missedPredictions}
            subtitle="Expired without match"
            icon={AlertTriangle}
            gradient="from-amber-500 to-orange-600"
          />
          <KpiCard
            title="Route Efficiency"
            value={`${feedbackMetrics.routeEfficiencyGain.toFixed(1)}%`}
            subtitle="Distance saved vs naive"
            icon={TrendingUp}
            gradient="from-indigo-500 to-blue-600"
          />
        </div>
      )}

      {/* Second row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Users"
          value={kpis.totalUsers}
          subtitle="Residents registered"
          icon={Users}
          gradient="from-cyan-500 to-blue-600"
        />
        <KpiCard
          title="Collectors"
          value={kpis.totalCollectors}
          subtitle="Active workforce"
          icon={Activity}
          gradient="from-pink-500 to-rose-600"
        />
        <KpiCard
          title="Avg Rating"
          value={
            kpis.avgCollectorRating > 0
              ? kpis.avgCollectorRating.toFixed(1)
              : "—"
          }
          subtitle={`${kpis.totalReviews} reviews`}
          icon={Star}
          gradient="from-amber-400 to-yellow-600"
        />
        <KpiCard
          title="Pending"
          value={kpis.pendingReports}
          subtitle="Awaiting pickup"
          icon={AlertTriangle}
          gradient={
            kpis.pendingReports > 10
              ? "from-red-500 to-rose-600"
              : "from-slate-500 to-slate-600"
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* 7-Day Activity Area Chart */}
        <Card className="lg:col-span-3 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              7-Day Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={dailyActivity}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="reportGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="completedGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="reports"
                  name="Submitted"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#reportGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#completedGradient)"
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution Donut */}
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Waste Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2.5 shadow-xl text-xs">
                        <p className="font-semibold capitalize">
                          {payload[0].name}
                        </p>
                        <p>{payload[0].value} reports</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  iconSize={8}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value: string) => (
                    <span className="capitalize text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {paiHistory.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              PAI And Threshold Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={paiHistory}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="pai"
                  name="PAI"
                  stroke="#8B5CF6"
                  fillOpacity={0.2}
                  fill="#8B5CF6"
                />
                <Area
                  type="monotone"
                  dataKey="threshold"
                  name="Threshold"
                  stroke="#06B6D4"
                  fillOpacity={0.12}
                  fill="#06B6D4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Collector Leaderboard */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Top Collectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collectorLeaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No collector data available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {collectorLeaderboard.map((collector, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-amber-600"
                          : i === 1
                            ? "bg-gradient-to-br from-slate-300 to-slate-500"
                            : i === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-600"
                              : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{collector.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collector.completedJobs} jobs completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s < Math.round(collector.avgRating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-muted text-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {collector.avgRating > 0
                          ? collector.avgRating.toFixed(1)
                          : "No"}{" "}
                        rating
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      avg {collector.avgHours}h
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
