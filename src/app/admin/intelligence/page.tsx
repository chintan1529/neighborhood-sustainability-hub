import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getRiskZones, getRiskSummary, getMismatchZones } from '@/lib/risk-scoring-engine';
import { IntelligenceCharts } from '@/components/admin/intelligence-charts';
import { RiskMapClient } from '@/components/admin/risk-map-client';
import { RecalculateButton, SeedBenchmarksButton } from '@/components/admin/recalculate-button';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function IntelligenceDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();

    // ── Parallel data fetching ───────────────────────────────────────────
    const [
        riskKpis,
        riskZones,
        mismatches,
        { data: benchmarksRaw },
        { data: dailyReports },
        { data: weeklyReports },
        { data: neighborhoodData },
    ] = await Promise.all([
        getRiskSummary(),
        getRiskZones(),
        getMismatchZones(),
        admin.from('government_benchmarks').select('*').order('cleanliness_rank', { ascending: true }),
        // 30-day daily reports
        admin
            .from('waste_reports')
            .select('created_at, status, completed_at, predicted_class, confirmed_class')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .neq('status', 'cancelled'),
        // 4-week reports for category breakdown
        admin
            .from('waste_reports')
            .select('created_at, predicted_class, confirmed_class')
            .gte('created_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
            .neq('status', 'cancelled'),
        // Platform city
        admin.from('neighborhoods').select('city, latitude, longitude').limit(1).single(),
    ]);

    // ── Process 30-day daily trend ───────────────────────────────────────
    const now = new Date();
    const dailyMap: Record<string, { submitted: number; completed: number }> = {};
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        dailyMap[key] = { submitted: 0, completed: 0 };
    }

    (dailyReports || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (dailyMap[key]) {
            dailyMap[key].submitted++;
            if (r.status === 'completed') dailyMap[key].completed++;
        }
    });

    const dailyTrend = Object.entries(dailyMap).map(([date, data]) => ({
        date,
        submitted: data.submitted,
        completed: data.completed,
    }));

    // ── Process weekly category breakdown ────────────────────────────────
    const categoryWeeks: Record<string, Record<string, number>> = {};
    for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const label = `W${4 - w}`;
        categoryWeeks[label] = { plastic: 0, organic: 0, metal: 0, paper: 0, glass: 0, cardboard: 0, mixed: 0 };

        (weeklyReports || []).forEach((r: any) => {
            const rd = new Date(r.created_at);
            if (rd >= weekStart && rd < weekEnd) {
                const cat = r.confirmed_class || r.predicted_class || 'mixed';
                if (categoryWeeks[label][cat] !== undefined) {
                    categoryWeeks[label][cat]++;
                }
            }
        });
    }

    const categoryWeekly = Object.entries(categoryWeeks).map(([week, cats]) => ({
        week,
        ...cats,
    }));

    // ── Top zones by density ─────────────────────────────────────────────
    const topZones = riskZones
        .sort((a, b) => b.report_count - a.report_count)
        .slice(0, 10)
        .map((z) => ({
            zone_id: z.zone_id,
            report_count: z.report_count,
            risk_level: z.risk_level,
            risk_score: z.risk_score,
        }));

    // ── 7-day forecast (weighted moving average) ─────────────────────────
    const last14DayCounts: number[] = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        last14DayCounts.push(dailyMap[key]?.submitted || 0);
    }

    // Exponential weighted moving average
    const alpha = 0.3;
    let ewma = last14DayCounts[0] || 0;
    const residuals: number[] = [];
    for (const count of last14DayCounts) {
        ewma = alpha * count + (1 - alpha) * ewma;
        residuals.push(Math.abs(count - ewma));
    }
    const avgResidual = residuals.length > 0
        ? residuals.reduce((a, b) => a + b, 0) / residuals.length
        : 1;

    const forecast: { day: string; predicted: number; lower: number; upper: number }[] = [];
    let currentEwma = ewma;
    for (let i = 1; i <= 7; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dayLabel = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
        const uncertainty = avgResidual * (1 + 0.1 * i); // widening band
        forecast.push({
            day: dayLabel,
            predicted: Math.max(0, Math.round(currentEwma)),
            lower: Math.max(0, Math.round(currentEwma - uncertainty)),
            upper: Math.round(currentEwma + uncertainty),
        });
        currentEwma = currentEwma * 0.98; // slight decay for conservatism
    }

    // ── Benchmarks ───────────────────────────────────────────────────────
    const benchmarks = (benchmarksRaw || []).map((b: any) => ({
        city: b.city,
        state: b.state,
        cleanliness_rank: b.cleanliness_rank,
        cleanliness_score: Number(b.cleanliness_score),
        waste_processed_tpd: Number(b.waste_processed_tpd),
        door_to_door_coverage_pct: Number(b.door_to_door_coverage_pct),
        source_segregation_pct: Number(b.source_segregation_pct),
        population_lakhs: Number(b.population_lakhs),
    }));

    const platformCity = (neighborhoodData as any)?.city || 'Bangalore';
    const mapCenter: [number, number] = [
        Number((neighborhoodData as any)?.latitude) || 12.9716,
        Number((neighborhoodData as any)?.longitude) || 77.5946,
    ];

    // Prepare risk zones for the map
    const mapZones = riskZones.map((z) => ({
        zone_id: z.zone_id,
        risk_score: z.risk_score,
        risk_level: z.risk_level,
        report_count: z.report_count,
        unresolved_count: z.unresolved_count,
        dominant_category: z.dominant_category,
        latitude: z.latitude,
        longitude: z.longitude,
        updated_at: z.updated_at,
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        Waste Intelligence
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 text-[10px] font-medium">
                            <Sparkles className="h-3 w-3" /> Analytics
                        </span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Risk scoring, geospatial analysis, and government benchmark comparison
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <SeedBenchmarksButton />
                    <RecalculateButton />
                </div>
            </div>

            {/* Risk Map */}
            <RiskMapClient initialZones={mapZones} center={mapCenter} />

            {/* Charts & Analytics */}
            <IntelligenceCharts
                riskKpis={riskKpis}
                dailyTrend={dailyTrend}
                categoryWeekly={categoryWeekly as any}
                topZones={topZones}
                benchmarks={benchmarks}
                mismatches={mismatches}
                forecast={forecast}
                platformCity={platformCity}
            />
        </div>
    );
}
