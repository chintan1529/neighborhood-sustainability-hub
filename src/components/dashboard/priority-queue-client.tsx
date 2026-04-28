"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  AlertTriangle,
  Filter,
  MapPin,
  RefreshCw,
  Zap,
  Timer,
  Activity,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WASTE_CATEGORIES } from "@/lib/constants";
import {
  type PriorityTier,
  getTierLabel,
  getSLAColor,
} from "@/lib/priority-engine";

interface PriorityReport {
  id: string;
  status: string;
  predicted_class: string | null;
  confirmed_class: string | null;
  address_text: string | null;
  quantity_estimate: string | null;
  created_at: string;
  notes: string | null;
  priority: {
    score: number;
    tier: PriorityTier;
    color: string;
    bgColor: string;
    borderColor: string;
    darkBgColor: string;
    darkBorderColor: string;
    icon: string;
    reasons: string[];
    slaStatus: string;
    hoursRemaining: number;
    breakdown: {
      wasteTypeScore: number;
      ageScore: number;
      quantityScore: number;
      densityScore: number;
      confidenceScore: number;
    };
  };
}

interface PrioritySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const TIER_FILTERS: { value: string; label: string; color: string }[] = [
  { value: "all", label: "All", color: "text-foreground" },
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-amber-600" },
  { value: "medium", label: "Medium", color: "text-blue-600" },
  { value: "low", label: "Low", color: "text-emerald-600" },
];

export default function PriorityQueueClient() {
  const [reports, setReports] = useState<PriorityReport[]>([]);
  const [summary, setSummary] = useState<PrioritySummary>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPriorities = useCallback(async () => {
    setLoading(true);
    try {
      const tierParam = filter !== "all" ? `&tier=${filter}` : "";
      const res = await fetch(`/api/waste-priority?status=pending${tierParam}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch priorities:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
            Priority Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-scored waste reports ranked by urgency
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPriorities}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Total",
            count: summary.total,
            color: "from-slate-500 to-slate-600",
            icon: Activity,
          },
          {
            label: "Critical",
            count: summary.critical,
            color: "from-red-500 to-red-600",
            icon: AlertTriangle,
          },
          {
            label: "High",
            count: summary.high,
            color: "from-amber-500 to-amber-600",
            icon: Zap,
          },
          {
            label: "Medium",
            count: summary.medium,
            color: "from-blue-500 to-blue-600",
            icon: Clock,
          },
          {
            label: "Low",
            count: summary.low,
            color: "from-emerald-500 to-emerald-600",
            icon: Timer,
          },
        ].map(({ label, count, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-2xl font-semibold mt-0.5 tabular-nums">{count}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {TIER_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === t.value
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {t.label}
            {t.value !== "all" && (
              <span className="ml-1 opacity-70">
                {t.value === "critical"
                  ? summary.critical
                  : t.value === "high"
                    ? summary.high
                    : t.value === "medium"
                      ? summary.medium
                      : summary.low}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Report List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">
              No pending reports
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {filter !== "all"
                ? `No ${filter} priority reports. Try a different filter.`
                : "All caught up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const wasteType =
              report.confirmed_class || report.predicted_class || "mixed";
            const cat =
              WASTE_CATEGORIES[wasteType as keyof typeof WASTE_CATEGORIES];
            const p = report.priority;
            const isExpanded = expandedId === report.id;

            return (
              <Card
                key={report.id}
                className={`group relative overflow-hidden border transition-all duration-200 cursor-pointer hover:shadow-md ${p.borderColor} ${p.darkBorderColor}`}
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
              >
                {/* Priority accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    p.tier === "critical"
                      ? "bg-red-500"
                      : p.tier === "high"
                        ? "bg-amber-500"
                        : p.tier === "medium"
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                  }`}
                />

                <CardContent className="py-4 px-5 pl-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Waste icon */}
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                        {cat?.icon || "🗑️"}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm capitalize">
                            {cat?.label || wasteType}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium ${p.color} ${p.borderColor} ${p.darkBorderColor}`}
                          >
                            {p.icon} {getTierLabel(p.tier)}
                          </Badge>
                          {p.slaStatus !== "safe" && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${getSLAColor(p.slaStatus as any)} border-current`}
                            >
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              {p.slaStatus === "breached"
                                ? "SLA Breached"
                                : p.slaStatus === "critical"
                                  ? `${p.hoursRemaining}h left`
                                  : `${p.hoursRemaining}h left`}
                            </Badge>
                          )}
                        </div>

                        {/* Address */}
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {report.address_text || "Unknown location"}
                          </p>
                        </div>

                        {/* Priority score bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                p.tier === "critical"
                                  ? "bg-gradient-to-r from-red-500 to-red-600"
                                  : p.tier === "high"
                                    ? "bg-gradient-to-r from-amber-500 to-amber-600"
                                    : p.tier === "medium"
                                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                              }`}
                              style={{ width: `${p.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground w-8">
                            {p.score}
                          </span>
                        </div>

                        {/* Expanded: breakdown + reasons */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                {
                                  label: "Waste",
                                  val: p.breakdown.wasteTypeScore,
                                },
                                { label: "Age", val: p.breakdown.ageScore },
                                {
                                  label: "Qty",
                                  val: p.breakdown.quantityScore,
                                },
                                {
                                  label: "Density",
                                  val: p.breakdown.densityScore,
                                },
                                {
                                  label: "AI Conf",
                                  val: p.breakdown.confidenceScore,
                                },
                              ].map((f) => (
                                <div key={f.label} className="text-center">
                                  <div className="text-[10px] text-muted-foreground">
                                    {f.label}
                                  </div>
                                  <div className="text-xs font-bold">
                                    {f.val}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {p.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side: time + chevron */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(report.created_at)}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground/40 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
