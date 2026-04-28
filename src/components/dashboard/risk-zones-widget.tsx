import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";

interface RiskZoneItem {
  zone_id: string;
  risk_score: number;
  risk_level: string;
  report_count: number;
  unresolved_count: number;
  dominant_category: string | null;
}

const RISK_LABELS: Record<string, { label: string; dot: string }> = {
  critical: { label: "Critical", dot: "bg-red-500" },
  high: { label: "High", dot: "bg-amber-500" },
  medium: { label: "Medium", dot: "bg-yellow-500" },
  low: { label: "Low", dot: "bg-emerald-500" },
};

interface RiskZonesWidgetProps {
  zones: RiskZoneItem[];
  showViewAll?: boolean;
  viewAllHref?: string;
  role?: "admin" | "collector";
}

export function RiskZonesWidget({
  zones,
  showViewAll = true,
  viewAllHref = "/admin/intelligence",
  role = "admin",
}: RiskZonesWidgetProps) {
  if (zones.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Risk Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">All Clear</p>
          <p className="text-xs text-muted-foreground mt-1">
            No high-risk areas detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            {role === "collector" ? "Priority Zones" : "Risk Alerts"}
          </CardTitle>
          {showViewAll && (
            <Link
              href={viewAllHref}
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-150"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {zones.slice(0, 3).map((zone) => {
            const config = RISK_LABELS[zone.risk_level] || RISK_LABELS.low;
            return (
              <div
                key={zone.zone_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors duration-150"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${config.dot} shrink-0`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">
                        Zone {zone.zone_id}
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{zone.report_count} reports</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{zone.unresolved_count} unresolved</span>
                      {zone.dominant_category && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="capitalize">
                            {zone.dominant_category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {role === "collector" && (
                  <Link
                    href="/collector/map"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 transition-colors duration-150"
                  >
                    <MapPin className="w-3 h-3" /> Map
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
