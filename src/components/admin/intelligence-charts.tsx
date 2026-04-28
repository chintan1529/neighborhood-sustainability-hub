"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Shield,
  Activity,
  MapPin,
  TrendingUp,
  Zap,
  Eye,
  BarChart3,
  Globe,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RiskKPIs {
  totalZones: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgScore: number;
  totalUnresolved: number;
}

interface DailyTrend {
  date: string;
  submitted: number;
  completed: number;
}

interface CategoryWeek {
  week: string;
  plastic: number;
  organic: number;
  metal: number;
  paper: number;
  glass: number;
  cardboard: number;
  mixed: number;
}

interface ZoneDensity {
  zone_id: string;
  report_count: number;
  risk_level: string;
  risk_score: number;
}

interface GovernmentBenchmark {
  city: string;
  state: string;
  cleanliness_rank: number;
  cleanliness_score: number;
  waste_processed_tpd: number;
  door_to_door_coverage_pct: number;
  source_segregation_pct: number;
  population_lakhs: number;
}

interface MismatchZone {
  zone_id: string;
  risk_score: number;
  risk_level: string;
  report_count: number;
  city: string;
  gov_cleanliness_score: number;
  mismatch_type: string;
  mismatch_severity: number;
}

interface ForecastPoint {
  day: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface IntelligenceChartsProps {
  riskKpis: RiskKPIs;
  dailyTrend: DailyTrend[];
  categoryWeekly: CategoryWeek[];
  topZones: ZoneDensity[];
  benchmarks: GovernmentBenchmark[];
  mismatches: MismatchZone[];
  forecast: ForecastPoint[];
  platformCity: string;
}

// ── Shared ─────────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const CATEGORY_COLORS: Record<string, string> = {
  plastic: "#3B82F6",
  organic: "#10B981",
  metal: "#6366F1",
  paper: "#F59E0B",
  cardboard: "#F97316",
  glass: "#06B6D4",
  mixed: "#8B5CF6",
};

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

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  gradient: string;
}) {
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
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function IntelligenceCharts({
  riskKpis,
  dailyTrend,
  categoryWeekly,
  topZones,
  benchmarks,
  mismatches,
  forecast,
  platformCity,
}: IntelligenceChartsProps) {
  const platformBenchmark = benchmarks.find(
    (b) => b.city.toLowerCase() === platformCity.toLowerCase(),
  );

  return (
    <div className="space-y-6">
      {/* ── Risk KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monitored Zones"
          value={riskKpis.totalZones}
          subtitle={`${riskKpis.criticalCount + riskKpis.highCount} need attention`}
          icon={MapPin}
          gradient="from-blue-500 to-indigo-600"
        />
        <KpiCard
          title="Critical Zones"
          value={riskKpis.criticalCount}
          subtitle={`${riskKpis.highCount} high risk`}
          icon={AlertTriangle}
          gradient={
            riskKpis.criticalCount > 0
              ? "from-red-500 to-rose-600"
              : "from-emerald-500 to-green-600"
          }
        />
        <KpiCard
          title="Avg Risk Score"
          value={riskKpis.avgScore.toFixed(1)}
          subtitle="Across all zones"
          icon={Activity}
          gradient={
            riskKpis.avgScore >= 60
              ? "from-red-500 to-orange-600"
              : riskKpis.avgScore >= 30
                ? "from-amber-500 to-yellow-600"
                : "from-emerald-500 to-teal-600"
          }
        />
        <KpiCard
          title="Unresolved Reports"
          value={riskKpis.totalUnresolved}
          subtitle="Pending action"
          icon={Eye}
          gradient="from-violet-500 to-purple-600"
        />
      </div>

      {/* ── City Benchmark Comparison ── */}
      {platformBenchmark && (
        <Card className="border border-border/50 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {platformCity} — Swachh Survekshan 2024
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rank #{platformBenchmark.cleanliness_rank} nationally
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {platformBenchmark.cleanliness_score}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Gov Score
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{
                      color:
                        riskKpis.avgScore >= 60
                          ? "#EF4444"
                          : riskKpis.avgScore >= 30
                            ? "#EAB308"
                            : "#22C55E",
                    }}
                  >
                    {riskKpis.avgScore.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Platform Risk
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {platformBenchmark.source_segregation_pct}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Segregation
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Mismatch Alerts ── */}
      {mismatches.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Zap className="h-4 w-4" /> Data Mismatch Alerts
            </CardTitle>
            <CardDescription className="text-xs">
              Zones where platform risk data contradicts government cleanliness
              benchmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {mismatches.slice(0, 4).map((m) => (
                <div
                  key={m.zone_id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-lg border shadow-sm"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: RISK_COLORS[m.risk_level] }}
                  >
                    {Math.round(m.risk_score)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      Zone {m.zone_id}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.mismatch_type === "high_risk_clean_city"
                        ? `High risk despite ${m.city} ranking well (score ${m.gov_cleanliness_score})`
                        : `Low risk but ${m.city} ranks poorly (score ${m.gov_cleanliness_score})`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0"
                    style={{
                      borderColor:
                        m.mismatch_type === "high_risk_clean_city"
                          ? "#EF4444"
                          : "#EAB308",
                      color:
                        m.mismatch_type === "high_risk_clean_city"
                          ? "#EF4444"
                          : "#EAB308",
                    }}
                  >
                    {Math.round(m.mismatch_severity * 100)}% mismatch
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Charts Row 1: Trend + Zone Density ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* 30-day waste volume trend */}
        <Card className="lg:col-span-3 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> 30-Day Waste Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={dailyTrend}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="intSubmittedGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="intCompletedGrad"
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
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name="Submitted"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#intSubmittedGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#intCompletedGrad)"
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top zones by density */}
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" /> Top Risk Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topZones.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  type="category"
                  dataKey="zone_id"
                  width={60}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="report_count"
                  name="Reports"
                  radius={[0, 4, 4, 0]}
                >
                  {topZones.slice(0, 8).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={RISK_COLORS[entry.risk_level] || "#9CA3AF"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Category Trend + Forecast ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly category breakdown */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Category Breakdown (Weekly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={categoryWeekly}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    name={cat}
                    stackId="a"
                    fill={color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 7-day forecast */}
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" /> 7-Day Forecast
            </CardTitle>
            <CardDescription className="text-xs">
              Weighted moving average prediction with confidence band
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={forecast}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="Upper Bound"
                  stroke="none"
                  fill="url(#forecastBand)"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="Lower Bound"
                  stroke="none"
                  fill="none"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#8B5CF6" }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Government Benchmark Table ── */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" /> Swachh Survekshan 2024
            — City Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                    Rank
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                    City
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">
                    State
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                    Score
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                    Waste TPD
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                    D2D %
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                    Segregation %
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.slice(0, 15).map((b) => {
                  const isHighlighted =
                    b.city.toLowerCase() === platformCity.toLowerCase();
                  return (
                    <tr
                      key={b.city}
                      className={`border-b last:border-0 transition-colors ${
                        isHighlighted
                          ? "bg-blue-50 dark:bg-blue-950/20 font-medium"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            b.cleanliness_rank <= 3
                              ? "bg-emerald-100 text-emerald-700"
                              : b.cleanliness_rank <= 10
                                ? "bg-blue-100 text-blue-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {b.cleanliness_rank}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {b.city}
                        {isHighlighted && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200"
                          >
                            YOUR CITY
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {b.state}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.cleanliness_score}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.waste_processed_tpd.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.door_to_door_coverage_pct}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-mono ${
                            b.source_segregation_pct >= 80
                              ? "text-emerald-600"
                              : b.source_segregation_pct >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {b.source_segregation_pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
