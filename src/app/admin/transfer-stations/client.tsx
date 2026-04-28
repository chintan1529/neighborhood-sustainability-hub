"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import {
  Warehouse,
  MapPin,
  Clock,
  Phone,
  Truck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Package,
  Zap,
} from "lucide-react";

interface TransferStation {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  address_text: string;
  capacity_tons: number;
  current_load_tons: number;
  operating_hours: string;
  waste_types_accepted: string[];
  is_active: boolean;
  contact_phone: string | null;
  notes: string | null;
}

interface RecentReport {
  latitude: number;
  longitude: number;
  confirmed_class: string;
  created_at: string;
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_CONFIG = {
  low: {
    color: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    label: "Low Load",
    icon: CheckCircle2,
  },
  medium: {
    color: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    label: "Moderate",
    icon: TrendingUp,
  },
  high: {
    color: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50 dark:bg-red-950/30",
    label: "Near Capacity",
    icon: AlertTriangle,
  },
};

function getLoadStatus(current: number, capacity: number) {
  const pct = (current / capacity) * 100;
  if (pct < 50) return STATUS_CONFIG.low;
  if (pct < 80) return STATUS_CONFIG.medium;
  return STATUS_CONFIG.high;
}

const WASTE_COLORS: Record<string, string> = {
  plastic: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  cardboard:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  paper: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  metal: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  glass: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  organic: "bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400",
  mixed:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
};

export function TransferStationsClient({
  stations,
  recentReports,
}: {
  stations: TransferStation[];
  recentReports: RecentReport[];
}) {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  // Calculate reports served by each station (nearest station assignment)
  const stationMetrics = useMemo(() => {
    const metrics = new Map<
      string,
      {
        reportCount: number;
        estimatedTons: number;
        categories: Record<string, number>;
      }
    >();

    stations.forEach((s) => {
      metrics.set(s.id, { reportCount: 0, estimatedTons: 0, categories: {} });
    });

    recentReports.forEach((report) => {
      let nearest: string | null = null;
      let minDist = Infinity;

      stations.forEach((s) => {
        const d = haversine(
          report.latitude,
          report.longitude,
          s.latitude,
          s.longitude,
        );
        if (d < minDist) {
          minDist = d;
          nearest = s.id;
        }
      });

      if (nearest && metrics.has(nearest)) {
        const m = metrics.get(nearest)!;
        m.reportCount++;
        m.estimatedTons += 0.015; // ~15kg per report avg
        const cat = report.confirmed_class || "mixed";
        m.categories[cat] = (m.categories[cat] || 0) + 1;
      }
    });

    return metrics;
  }, [stations, recentReports]);

  // Summary KPIs
  const totalCapacity = stations.reduce((sum, s) => sum + s.capacity_tons, 0);
  const totalLoad = stations.reduce((sum, s) => sum + s.current_load_tons, 0);
  const activeStations = stations.filter((s) => s.is_active).length;
  const avgUtilization =
    totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          Transfer Stations
          <Badge variant="secondary" className="text-xs font-medium">
            {activeStations} Active
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Intermediate depots that minimize long-distance waste hauling across
          the city
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-100 dark:border-orange-900/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                <Warehouse className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stations.length}</p>
                <p className="text-xs text-muted-foreground">Total Stations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 dark:border-blue-900/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalCapacity}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    t
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">Total Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgUtilization}
                  <span className="text-sm font-normal text-muted-foreground">
                    %
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">Avg Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-100 dark:border-violet-900/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                <Truck className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentReports.length}</p>
                <p className="text-xs text-muted-foreground">Reports (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stations.map((station) => {
          const metrics = stationMetrics.get(station.id);
          const loadPct =
            station.capacity_tons > 0
              ? (station.current_load_tons / station.capacity_tons) * 100
              : 0;
          const status = getLoadStatus(
            station.current_load_tons,
            station.capacity_tons,
          );
          const StatusIcon = status.icon;
          const isSelected = selectedStation === station.id;

          return (
            <Card
              key={station.id}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? "ring-2 ring-orange-500 shadow-lg"
                  : "hover:border-orange-200 dark:hover:border-orange-900/40"
              } ${!station.is_active ? "opacity-60" : ""}`}
              onClick={() => setSelectedStation(isSelected ? null : station.id)}
            >
              {/* Decorative gradient bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${status.color}`}
              />

              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {station.name}
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {station.code}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {station.address_text}
                    </CardDescription>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Capacity bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">
                      Capacity Utilization
                    </span>
                    <span className="font-semibold">
                      {station.current_load_tons}t / {station.capacity_tons}t
                    </span>
                  </div>
                  <Progress value={loadPct} className="h-2" />
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {station.operating_hours}
                  </span>
                  {station.contact_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {station.contact_phone}
                    </span>
                  )}
                </div>

                {/* Accepted waste types */}
                <div className="flex flex-wrap gap-1">
                  {station.waste_types_accepted.map((type) => (
                    <Badge
                      key={type}
                      variant="secondary"
                      className={`text-[10px] capitalize border-none ${WASTE_COLORS[type] || "bg-gray-100 text-gray-700"}`}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>

                {/* Expanded metrics */}
                {isSelected && metrics && (
                  <div className="pt-3 border-t space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      7-Day Activity
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold">
                          {metrics.reportCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reports Served
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold">
                          {metrics.estimatedTons.toFixed(1)}
                          <span className="text-xs font-normal">t</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Est. Throughput
                        </p>
                      </div>
                    </div>
                    {station.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        📝 {station.notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
