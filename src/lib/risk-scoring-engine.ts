import { createAdminClient } from "@/lib/supabase/server";
import ngeo from "ngeohash";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskZone {
  zone_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  report_count: number;
  unresolved_count: number;
  dominant_category: string | null;
  severity_index: number;
  last_cleanup_at: string | null;
  last_report_at: string | null;
  latitude: number;
  longitude: number;
  metadata: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface RiskZoneDetail extends RiskZone {
  config: RiskScoringConfig;
}

export interface RiskScoringConfig {
  weight_density: number;
  weight_severity: number;
  weight_recency: number;
  weight_unresolved: number;
  severity_weights: Record<string, number>;
}

export interface RiskComputationResult {
  zonesUpdated: number;
  zonesRemoved: number;
  duration: number;
  timestamp: string;
}

export interface MismatchZone {
  zone_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  report_count: number;
  city: string;
  gov_cleanliness_score: number;
  gov_rank: number;
  mismatch_type: "high_risk_clean_city" | "low_risk_dirty_city";
  mismatch_severity: number; // 0–1
}

export interface GovernmentBenchmark {
  id: string;
  city: string;
  state: string;
  cleanliness_rank: number;
  cleanliness_score: number;
  waste_processed_tpd: number;
  door_to_door_coverage_pct: number;
  source_segregation_pct: number;
  population_lakhs: number;
  survey_year: number;
  survey_source: string;
}

// ── Severity weights mapping ──────────────────────────────────────────────────

const CATEGORY_SEVERITY_KEYS: Record<string, string> = {
  plastic: "severity_plastic",
  metal: "severity_metal",
  glass: "severity_glass",
  cardboard: "severity_cardboard",
  paper: "severity_paper",
  organic: "severity_organic",
  mixed: "severity_mixed",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

// ── Core Engine ───────────────────────────────────────────────────────────────

async function loadConfig(): Promise<RiskScoringConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("risk_scoring_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!data) {
    return {
      weight_density: 0.3,
      weight_severity: 0.3,
      weight_recency: 0.2,
      weight_unresolved: 0.2,
      severity_weights: {
        plastic: 5,
        metal: 3,
        glass: 3,
        cardboard: 2,
        paper: 2,
        organic: 1,
        mixed: 2.5,
      },
    };
  }

  const severity_weights: Record<string, number> = {};
  for (const [cat, key] of Object.entries(CATEGORY_SEVERITY_KEYS)) {
    severity_weights[cat] = Number((data as any)[key] ?? 2.5);
  }

  return {
    weight_density: Number(data.weight_density),
    weight_severity: Number(data.weight_severity),
    weight_recency: Number(data.weight_recency),
    weight_unresolved: Number(data.weight_unresolved),
    severity_weights,
  };
}

function computeScore(
  config: RiskScoringConfig,
  reportCount: number,
  unresolvedCount: number,
  severitySum: number,
  hoursSinceLastReport: number,
): { score: number; level: RiskLevel; norms: Record<string, number> } {
  const densityNorm = clamp(reportCount / 20, 0, 1);
  const severityNorm = clamp(severitySum / (reportCount * 5), 0, 1);
  const recencyNorm = Math.exp(-hoursSinceLastReport / 168); // 7-day decay
  const unresolvedNorm = clamp(unresolvedCount / 10, 0, 1);

  const raw =
    config.weight_density * densityNorm +
    config.weight_severity * severityNorm +
    config.weight_recency * recencyNorm +
    config.weight_unresolved * unresolvedNorm;

  const score = round(clamp(raw * 100, 0, 100));

  const level: RiskLevel =
    score >= 80
      ? "critical"
      : score >= 60
        ? "high"
        : score >= 30
          ? "medium"
          : "low";

  return {
    score,
    level,
    norms: {
      density_norm: round(densityNorm, 4),
      severity_norm: round(severityNorm, 4),
      recency_norm: round(recencyNorm, 4),
      unresolved_norm: round(unresolvedNorm, 4),
    },
  };
}

/**
 * Full batch recomputation of all risk zones.
 * Admin-triggered only — not called on every report.
 */
export async function computeAllRiskScores(): Promise<RiskComputationResult> {
  const start = Date.now();
  const supabase = createAdminClient();
  const config = await loadConfig();

  // Fetch all reports (we group by geohash client-side for flexibility)
  const { data: reports } = await supabase
    .from("waste_reports")
    .select(
      "id, latitude, longitude, created_at, completed_at, status, predicted_class, confirmed_class",
    )
    .neq("status", "cancelled");

  if (!reports || reports.length === 0) {
    return {
      zonesUpdated: 0,
      zonesRemoved: 0,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }

  // Group reports by geohash zone (precision 5)
  const zones = new Map<
    string,
    {
      reports: typeof reports;
      latSum: number;
      lonSum: number;
    }
  >();

  for (const report of reports) {
    const zoneId = ngeo.encode(report.latitude, report.longitude, 5);
    const existing = zones.get(zoneId);
    if (existing) {
      existing.reports.push(report);
      existing.latSum += report.latitude;
      existing.lonSum += report.longitude;
    } else {
      zones.set(zoneId, {
        reports: [report],
        latSum: report.latitude,
        lonSum: report.longitude,
      });
    }
  }

  const now = Date.now();
  const upsertRows: any[] = [];

  for (const [zoneId, zone] of zones) {
    const reportCount = zone.reports.length;
    const unresolvedCount = zone.reports.filter((r: any) =>
      ["pending", "assigned", "in_progress"].includes(r.status),
    ).length;

    let severitySum = 0;
    const categoryCounts: Record<string, number> = {};
    let lastReportAt: Date | null = null;
    let lastCleanupAt: Date | null = null;

    for (const r of zone.reports) {
      const cat =
        (r as any).confirmed_class || (r as any).predicted_class || "mixed";
      severitySum += config.severity_weights[cat] ?? 2.5;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const createdAt = new Date(r.created_at);
      if (!lastReportAt || createdAt > lastReportAt) lastReportAt = createdAt;

      if ((r as any).status === "completed" && (r as any).completed_at) {
        const completedAt = new Date((r as any).completed_at);
        if (!lastCleanupAt || completedAt > lastCleanupAt)
          lastCleanupAt = completedAt;
      }
    }

    const dominantCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "mixed";

    const hoursSince = lastReportAt
      ? (now - lastReportAt.getTime()) / (1000 * 60 * 60)
      : 9999;

    const { score, level, norms } = computeScore(
      config,
      reportCount,
      unresolvedCount,
      severitySum,
      hoursSince,
    );

    upsertRows.push({
      zone_id: zoneId,
      risk_score: score,
      risk_level: level,
      report_count: reportCount,
      unresolved_count: unresolvedCount,
      dominant_category: dominantCategory,
      severity_index: round(severitySum / Math.max(reportCount, 1), 3),
      last_cleanup_at: lastCleanupAt?.toISOString() || null,
      last_report_at: lastReportAt?.toISOString() || null,
      latitude: round(zone.latSum / reportCount, 8),
      longitude: round(zone.lonSum / reportCount, 8),
      metadata: norms,
    });
  }

  // Batch upsert
  let zonesUpdated = 0;
  for (const row of upsertRows) {
    const { error } = await supabase
      .from("area_risk_zones")
      .upsert(row, { onConflict: "zone_id" });
    if (!error) zonesUpdated++;
  }

  // Remove stale zones that no longer have reports
  const activeZoneIds = upsertRows.map((r: any) => r.zone_id);
  const { data: allZones } = await supabase
    .from("area_risk_zones")
    .select("zone_id");

  let zonesRemoved = 0;
  if (allZones) {
    const staleIds = allZones
      .map((z: any) => z.zone_id)
      .filter((id: string) => !activeZoneIds.includes(id));

    if (staleIds.length > 0) {
      await supabase.from("area_risk_zones").delete().in("zone_id", staleIds);
      zonesRemoved = staleIds.length;
    }
  }

  return {
    zonesUpdated,
    zonesRemoved,
    duration: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetch all risk zones, optionally filtered by minimum level.
 */
export async function getRiskZones(options?: {
  minLevel?: RiskLevel;
  limit?: number;
}): Promise<RiskZone[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("area_risk_zones")
    .select("*")
    .order("risk_score", { ascending: false });

  if (options?.minLevel) {
    const levelMap: Record<RiskLevel, number> = {
      low: 0,
      medium: 30,
      high: 60,
      critical: 80,
    };
    query = query.gte("risk_score", levelMap[options.minLevel]);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data || []) as RiskZone[];
}

/**
 * Get detailed risk info for a single zone.
 */
export async function getZoneRiskDetails(
  zoneId: string,
): Promise<RiskZoneDetail | null> {
  const supabase = createAdminClient();
  const config = await loadConfig();

  const { data } = await supabase
    .from("area_risk_zones")
    .select("*")
    .eq("zone_id", zoneId)
    .single();

  if (!data) return null;

  return { ...(data as RiskZone), config };
}

/**
 * Find mismatch zones: areas where platform risk contradicts government data.
 * - high_risk_clean_city: Platform shows high risk, but city ranks well in Swachh Survekshan
 * - low_risk_dirty_city: Platform shows low risk, but city ranks poorly
 */
export async function getMismatchZones(): Promise<MismatchZone[]> {
  const supabase = createAdminClient();

  const [{ data: riskZones }, { data: benchmarks }] = await Promise.all([
    supabase.from("area_risk_zones").select("*").gte("risk_score", 0),
    supabase
      .from("government_benchmarks")
      .select("*")
      .order("cleanliness_rank", { ascending: true }),
  ]);

  if (!riskZones || !benchmarks || benchmarks.length === 0) return [];

  // For each risk zone, find the nearest city benchmark by matching neighborhoods config
  // Since we don't have direct zone-to-city mapping, we use the platform's default city (Bangalore)
  // and compare against all benchmarks
  const { data: neighborhoods } = await supabase
    .from("neighborhoods")
    .select("city")
    .limit(1)
    .single();

  const platformCity = (neighborhoods as any)?.city || "Bangalore";
  const cityBenchmark = benchmarks.find(
    (b: any) => b.city.toLowerCase() === platformCity.toLowerCase(),
  );

  if (!cityBenchmark) return [];

  const mismatches: MismatchZone[] = [];
  const govScore = Number((cityBenchmark as any).cleanliness_score);
  const govRank = Number((cityBenchmark as any).cleanliness_rank);
  const govIsClean = govScore >= 70; // above 70 = considered clean

  for (const zone of riskZones) {
    const z = zone as RiskZone;
    const isHighRisk = z.risk_score >= 60;
    const isLowRisk = z.risk_score < 30;

    if (isHighRisk && govIsClean) {
      mismatches.push({
        zone_id: z.zone_id,
        risk_score: z.risk_score,
        risk_level: z.risk_level,
        report_count: z.report_count,
        city: platformCity,
        gov_cleanliness_score: govScore,
        gov_rank: govRank,
        mismatch_type: "high_risk_clean_city",
        mismatch_severity: round(
          clamp((z.risk_score - 60) / 40 + (govScore - 70) / 30, 0, 1),
          3,
        ),
      });
    } else if (isLowRisk && !govIsClean) {
      mismatches.push({
        zone_id: z.zone_id,
        risk_score: z.risk_score,
        risk_level: z.risk_level,
        report_count: z.report_count,
        city: platformCity,
        gov_cleanliness_score: govScore,
        gov_rank: govRank,
        mismatch_type: "low_risk_dirty_city",
        mismatch_severity: round(
          clamp((70 - govScore) / 30 + (30 - z.risk_score) / 30, 0, 1),
          3,
        ),
      });
    }
  }

  return mismatches.sort((a, b) => b.mismatch_severity - a.mismatch_severity);
}

/**
 * Get risk zone summary statistics for dashboard KPIs.
 */
export async function getRiskSummary() {
  const supabase = createAdminClient();
  const { data: zones } = await supabase
    .from("area_risk_zones")
    .select("risk_score, risk_level, report_count, unresolved_count");

  if (!zones || zones.length === 0) {
    return {
      totalZones: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      avgScore: 0,
      totalUnresolved: 0,
    };
  }

  return {
    totalZones: zones.length,
    criticalCount: zones.filter((z: any) => z.risk_level === "critical").length,
    highCount: zones.filter((z: any) => z.risk_level === "high").length,
    mediumCount: zones.filter((z: any) => z.risk_level === "medium").length,
    lowCount: zones.filter((z: any) => z.risk_level === "low").length,
    avgScore: round(
      zones.reduce((sum: number, z: any) => sum + Number(z.risk_score), 0) /
        zones.length,
    ),
    totalUnresolved: zones.reduce(
      (sum: number, z: any) => sum + (z.unresolved_count || 0),
      0,
    ),
  };
}
