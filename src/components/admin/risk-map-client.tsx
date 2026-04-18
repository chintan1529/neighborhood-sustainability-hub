"use client";

import dynamic from "next/dynamic";
import { useRealtimeRiskZones } from "@/hooks/use-realtime-risk";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/ui/leaflet-map"), {
  ssr: false,
});

const RISK_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface RiskMapProps {
  initialZones: any[];
  center: [number, number];
}

export function RiskMapClient({ initialZones, center }: RiskMapProps) {
  const { zones, isConnected, lastUpdated } =
    useRealtimeRiskZones(initialZones);

  // Convert risk zones to heatmap GeoJSON for the existing LeafletMap component
  const heatmapGeoJson = {
    type: "FeatureCollection" as const,
    features: zones.map((zone) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [zone.longitude, zone.latitude] as [number, number],
      },
      properties: {
        id: zone.zone_id,
        zoneId: zone.zone_id,
        confidence: zone.risk_score / 100,
        weight: zone.report_count,
        predictedCategory: zone.dominant_category,
        reason: `Risk: ${zone.risk_level.toUpperCase()} (${zone.risk_score}/100) | ${zone.report_count} reports | ${zone.unresolved_count} unresolved | Dominant: ${zone.dominant_category || "mixed"}`,
      },
    })),
  };

  return (
    <div className="relative">
      {/* Connection status */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
        {isConnected ? (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 gap-1 text-[10px] shadow-sm"
          >
            <Wifi className="h-3 w-3" /> Live
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 gap-1 text-[10px] shadow-sm"
          >
            <WifiOff className="h-3 w-3" /> Offline
          </Badge>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[500] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border text-xs space-y-1.5">
        <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Risk Level
        </p>
        {Object.entries(RISK_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{RISK_LABELS[level]}</span>
          </div>
        ))}
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
            Updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="h-[500px] w-full rounded-xl overflow-hidden border shadow-sm">
        <LeafletMap
          center={center}
          zoom={12}
          heatmapGeoJson={heatmapGeoJson as any}
        />
      </div>
    </div>
  );
}
