import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';

interface RiskZoneItem {
    zone_id: string;
    risk_score: number;
    risk_level: string;
    report_count: number;
    unresolved_count: number;
    dominant_category: string | null;
}

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; tag: string }> = {
    critical: { color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-800', label: 'Critical', tag: 'URGENT' },
    high: { color: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', label: 'High', tag: 'HIGH PRIORITY' },
    medium: { color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', label: 'Medium', tag: 'MONITOR' },
    low: { color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', label: 'Low', tag: 'STABLE' },
};

const RISK_BADGE_COLORS: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
};

interface RiskZonesWidgetProps {
    zones: RiskZoneItem[];
    showViewAll?: boolean;
    viewAllHref?: string;
    role?: 'admin' | 'collector';
}

export function RiskZonesWidget({
    zones,
    showViewAll = true,
    viewAllHref = '/admin/intelligence',
    role = 'admin',
}: RiskZonesWidgetProps) {
    if (zones.length === 0) {
        return (
            <Card className="border-dashed bg-muted/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" /> Risk Zones
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                    <p className="text-sm font-medium text-green-700">All Clear</p>
                    <p className="text-xs text-muted-foreground mt-1">No high-risk areas detected.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg shadow-red-900/5 border border-border/50">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        {role === 'collector' ? 'Priority Zones' : 'Risk Alerts'}
                    </CardTitle>
                    {showViewAll && (
                        <Link
                            href={viewAllHref}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                        >
                            View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {zones.slice(0, 3).map((zone) => {
                        const config = RISK_CONFIG[zone.risk_level] || RISK_CONFIG.low;
                        return (
                            <div
                                key={zone.zone_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg} transition-colors`}
                            >
                                <div className={`w-10 h-10 rounded-full ${RISK_BADGE_COLORS[zone.risk_level]} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0`}>
                                    {Math.round(zone.risk_score)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-semibold truncate">Zone {zone.zone_id}</p>
                                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${config.color} border-current`}>
                                            {config.tag}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                        <span>{zone.report_count} reports</span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        <span>{zone.unresolved_count} unresolved</span>
                                        {zone.dominant_category && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                                <span className="capitalize">{zone.dominant_category}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {role === 'collector' && (
                                    <Link
                                        href="/collector/map"
                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
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
