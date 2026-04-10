'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RiskLevel } from '@/lib/risk-scoring-engine';

interface RealtimeRiskZone {
    zone_id: string;
    risk_score: number;
    risk_level: RiskLevel;
    report_count: number;
    unresolved_count: number;
    dominant_category: string | null;
    latitude: number;
    longitude: number;
    updated_at: string;
}

/**
 * Subscribes to real-time changes on `area_risk_zones` via Supabase Realtime.
 * Returns live zone data + connection status.
 */
export function useRealtimeRiskZones(initialZones: RealtimeRiskZone[] = []) {
    const [zones, setZones] = useState<RealtimeRiskZone[]>(initialZones);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const criticalCount = zones.filter((z) => z.risk_level === 'critical').length;
    const highCount = zones.filter((z) => z.risk_level === 'high').length;

    useEffect(() => {
        setZones(initialZones);
    }, [initialZones]);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel('risk-zones-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'area_risk_zones',
                },
                (payload) => {
                    const newZone = payload.new as RealtimeRiskZone;
                    const oldZone = payload.old as Partial<RealtimeRiskZone>;

                    if (payload.eventType === 'DELETE' && oldZone?.zone_id) {
                        setZones((prev) => prev.filter((z) => z.zone_id !== oldZone.zone_id));
                    } else if (payload.eventType === 'INSERT') {
                        setZones((prev) => [...prev, newZone]);
                    } else if (payload.eventType === 'UPDATE') {
                        setZones((prev) =>
                            prev.map((z) => (z.zone_id === newZone.zone_id ? newZone : z))
                        );
                    }

                    setLastUpdated(new Date());
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { zones, criticalCount, highCount, lastUpdated, isConnected };
}
