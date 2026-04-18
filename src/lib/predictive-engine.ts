import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ngeo from "ngeohash";
import type { Database, WasteCategory } from "@/types/database";
import { haversineKm } from "@/lib/utils";
import {
  type AdaptiveFeatureScores,
  FEATURE_KEYS,
  computeConfidence,
  getAdaptiveWeights,
  optimizeAdaptiveWeights,
} from "@/lib/adaptive-weight-optimizer";

const PREDICTION_TABLE = "predicted_reports";
const LOCATION_RADIUS_KM = 0.35;
const HOTSPOT_NEARBY_RADIUS_KM = 0.6;
const PREDICTION_REFRESH_RADIUS_KM = 0.45;
const MAX_REPORTS_FOR_CONTEXT = 1500;
const MAX_CANDIDATES = 8;
const MIN_REPORTS_PER_CLUSTER = 2;
const DEFAULT_CONFIDENCE_THRESHOLD = Number(
  process.env.PREDICTION_CONFIDENCE_THRESHOLD ?? "0.6",
);
const ACTIVE_PREDICTION_HOURS = Number(
  process.env.PREDICTION_TARGET_HOURS ?? "24",
);
const FEEDBACK_WINDOW_HOURS = Number(
  process.env.PREDICTION_FEEDBACK_HOURS ?? "24",
);
const PAI_DECAY = Number(process.env.PREDICTION_PAI_DECAY ?? "0.85");
const PAI_WINDOW_CYCLES = Number(process.env.PREDICTION_PAI_WINDOW ?? "10");
const PAI_TARGET = Number(process.env.PREDICTION_PAI_TARGET ?? "0.8");

type WasteReportRow = Database["public"]["Tables"]["waste_reports"]["Row"];
type PredictedReportRow =
  Database["public"]["Tables"]["predicted_reports"]["Row"] & {
    metadata?: any;
    geohash?: string;
    feedback_count?: number;
    last_feedback_at?: string;
  };
type LocationWeightRow =
  Database["public"]["Tables"]["location_weights"]["Row"] & {
    geohash?: string;
  };
type ModelCalibrationRow = any;
type PredictionThresholdRow = any;
type PredictionCycleMetricRow = any;
type PredictionContextReport = Pick<
  WasteReportRow,
  | "id"
  | "latitude"
  | "longitude"
  | "created_at"
  | "predicted_class"
  | "confirmed_class"
  | "status"
> & {
  neighborhood_id?: string | null;
};

export interface PredictionCandidate {
  geohash: string;
  latitude: number;
  longitude: number;
  predicted_category: WasteCategory;
  base_confidence: number;
  confidence_lower: number;
  confidence_upper: number;
  final_weight: number;
  target_date: string;
  reason: string;
  report_count: number;
  feature_scores: AdaptiveFeatureScores;
  source: "deterministic";
}

interface ClusterSummary {
  geohash: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  latestReportAt: string;
  latestCategory: WasteCategory;
  categoryCounts: Record<string, number>;
  locationWeight: number;
  historicalVerificationRate: number;
  reports: PredictionContextReport[];
  dominantCategory: WasteCategory;
  categoryDominance: number;
  recent24hCount: number;
  recent72hCount: number;
  previous72hCount: number;
  recent7dCount: number;
  recent30dCount: number;
  averageGapHours: number | null;
  hourConcentration: number;
  dayConcentration: number;
  peakHourUtc: number;
  peakWeekdayUtc: number;
  nearbySupportScore: number;
  recurrenceScore: number;
  momentumScore: number;
  trendScore: number;
  stalenessScore: number;
  cadenceScore: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number = 3) {
  return Number(value.toFixed(digits));
}

/**
 * Create a typed service-role Supabase client for predictive engine operations.
 *
 * Note: We use `SupabaseClient` type assertion here because the Database type
 * definitions use self-referencing Omit patterns for Insert types that TypeScript
 * can't fully resolve across all 25+ operations in this module. The alternative
 * would be individual type assertions on each of the ~25 database calls.
 */
function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function hoursBetween(a: string, b: string) {
  return (
    Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60)
  );
}

function normalizeCategory(category: string | null | undefined): WasteCategory {
  const allowed: WasteCategory[] = [
    "cardboard",
    "metal",
    "paper",
    "plastic",
    "glass",
    "organic",
    "mixed",
  ];
  if (category && allowed.includes(category as WasteCategory)) {
    return category as WasteCategory;
  }
  return "mixed";
}

function getDominantCategory(categoryCounts: Record<string, number>) {
  const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { category: "mixed" as WasteCategory, dominance: 0 };
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return {
    category: normalizeCategory(entries[0][0]),
    dominance: total > 0 ? entries[0][1] / total : 0,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTemporalStats(reports: PredictionContextReport[]) {
  const hourBuckets = Array.from({ length: 24 }, () => 0);
  const dayBuckets = Array.from({ length: 7 }, () => 0);
  const sortedAscending = [...reports].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const report of reports) {
    const date = new Date(report.created_at);
    hourBuckets[date.getUTCHours()] += 1;
    dayBuckets[date.getUTCDay()] += 1;
  }

  const peakHour = hourBuckets.reduce(
    (best, count, hour) => (count > best.count ? { index: hour, count } : best),
    { index: 12, count: 0 },
  );
  const peakWeekday = dayBuckets.reduce(
    (best, count, day) => (count > best.count ? { index: day, count } : best),
    { index: new Date().getUTCDay(), count: 0 },
  );

  const gaps: number[] = [];
  for (let index = 1; index < sortedAscending.length; index += 1) {
    gaps.push(
      hoursBetween(
        sortedAscending[index].created_at,
        sortedAscending[index - 1].created_at,
      ),
    );
  }

  return {
    peakHourUtc: peakHour.index,
    peakWeekdayUtc: peakWeekday.index,
    hourConcentration: reports.length > 0 ? peakHour.count / reports.length : 0,
    dayConcentration:
      reports.length > 0 ? peakWeekday.count / reports.length : 0,
    averageGapHours: average(gaps),
  };
}

function getNextTargetDate(
  peakHourUtc: number,
  peakWeekdayUtc: number,
  dayConcentration: number,
) {
  const now = new Date();
  const target = new Date(now);
  target.setUTCMinutes(0, 0, 0);
  target.setUTCHours(peakHourUtc);

  if (target.getTime() <= now.getTime() + 60 * 60 * 1000) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  if (dayConcentration >= 0.45) {
    let guard = 0;
    while (target.getUTCDay() !== peakWeekdayUtc && guard < 7) {
      target.setUTCDate(target.getUTCDate() + 1);
      guard += 1;
    }
  }

  const maxTarget = new Date(
    now.getTime() + ACTIVE_PREDICTION_HOURS * 60 * 60 * 1000,
  );
  if (target.getTime() > maxTarget.getTime()) {
    return maxTarget.toISOString();
  }

  return target.toISOString();
}

function buildAdaptiveFeatureScores(
  cluster: ClusterSummary,
): AdaptiveFeatureScores {
  const frequencyScore = clamp(
    (cluster.reportCount / 8) * 0.25 +
      cluster.momentumScore * 0.45 +
      cluster.recurrenceScore * 0.3,
    0,
    1,
  );
  const locationScore = clamp(
    (Number(cluster.locationWeight || 1) / 1.6) * 0.45 +
      cluster.historicalVerificationRate * 0.35 +
      cluster.nearbySupportScore * 0.2,
    0,
    1,
  );
  const temporalScore = clamp(
    cluster.hourConcentration * 0.35 +
      cluster.dayConcentration * 0.25 +
      cluster.cadenceScore * 0.2 +
      cluster.trendScore * 0.2,
    0,
    1,
  );

  return {
    R: round(cluster.stalenessScore, 4),
    F: round(frequencyScore, 4),
    D: round(cluster.categoryDominance, 4),
    L: round(locationScore, 4),
    T: round(temporalScore, 4),
  };
}

async function countActualHotspotsForZone(
  supabase: any,
  zoneId: string,
  cycleStart: string,
  cycleEndedAt: string,
) {
  const { data: reports } = await supabase
    .from("waste_reports")
    .select("latitude, longitude")
    .gte("created_at", cycleStart)
    .lt("created_at", cycleEndedAt);

  return (
    (reports ?? []) as Array<{ latitude: number; longitude: number }>
  ).filter(
    (report) => ngeo.encode(report.latitude, report.longitude, 6) === zoneId,
  ).length;
}

async function getZoneThreshold(supabase: any, zoneId: string) {
  const { data: existing } = await supabase
    .from("prediction_thresholds")
    .select("*")
    .eq("zone_id", zoneId)
    .single();

  if (existing) {
    return existing as PredictionThresholdRow;
  }

  const { data: inserted } = await supabase
    .from("prediction_thresholds")
    .insert({
      zone_id: zoneId,
      threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      baseline_threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      min_threshold: 0.4,
      max_threshold: 0.9,
      learning_rate: 0.05,
      target_pai: PAI_TARGET,
    })
    .select("*")
    .single();

  return (inserted ?? {
    zone_id: zoneId,
    threshold: DEFAULT_CONFIDENCE_THRESHOLD,
    baseline_threshold: DEFAULT_CONFIDENCE_THRESHOLD,
    min_threshold: 0.4,
    max_threshold: 0.9,
    learning_rate: 0.05,
    target_pai: PAI_TARGET,
  }) as PredictionThresholdRow;
}

async function recalculateZoneMetrics(supabase: any, zoneId: string) {
  const threshold = await getZoneThreshold(supabase, zoneId);
  const { data: rows } = await supabase
    .from("prediction_cycle_metrics")
    .select("*")
    .eq("zone_id", zoneId)
    .order("cycle_ended_at", { ascending: false })
    .limit(PAI_WINDOW_CYCLES);

  const cycles = (rows ?? []) as PredictionCycleMetricRow[];
  if (cycles.length === 0) {
    return { pai: 0, threshold };
  }

  let weightedVerified = 0;
  let weightedEvaluated = 0;
  cycles.forEach((cycle, index) => {
    const weight = PAI_DECAY ** index;
    weightedVerified += weight * (cycle.verified_count ?? 0);
    weightedEvaluated += weight * (cycle.evaluated_count ?? 0);
  });

  const pai = weightedEvaluated > 0 ? weightedVerified / weightedEvaluated : 0;
  const nextThreshold = clamp(
    threshold.baseline_threshold -
      threshold.learning_rate * (pai - threshold.target_pai),
    threshold.min_threshold,
    threshold.max_threshold,
  );

  await supabase
    .from("prediction_thresholds")
    .update({
      threshold: round(nextThreshold, 3),
      updated_at: new Date().toISOString(),
    })
    .eq("zone_id", zoneId);

  return {
    pai: round(pai, 4),
    threshold: {
      ...threshold,
      threshold: round(nextThreshold, 3),
    } as PredictionThresholdRow,
  };
}

async function recordFeedbackCycle(
  supabase: any,
  zoneId: string,
  cycleEndedAt: string,
) {
  const threshold = await getZoneThreshold(supabase, zoneId);
  const cycleStart = new Date(
    new Date(cycleEndedAt).getTime() - FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { data: feedbackRows } = await supabase
    .from("prediction_feedback_records")
    .select("*")
    .eq("zone_id", zoneId)
    .gte("evaluated_at", cycleStart)
    .lt("evaluated_at", cycleEndedAt);

  const cycleFeedback = (feedbackRows ?? []) as Array<{ status: string }>;
  if (cycleFeedback.length === 0) {
    return null;
  }

  const verifiedCount = cycleFeedback.filter(
    (row) => row.status === "verified",
  ).length;
  const evaluatedCount = cycleFeedback.length;
  const precision = evaluatedCount > 0 ? verifiedCount / evaluatedCount : 0;
  const actualHotspots = await countActualHotspotsForZone(
    supabase,
    zoneId,
    cycleStart,
    cycleEndedAt,
  );
  const recall =
    actualHotspots > 0 ? verifiedCount / actualHotspots : precision;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  const { data: inserted } = await supabase
    .from("prediction_cycle_metrics")
    .insert({
      zone_id: zoneId,
      cycle_started_at: cycleStart,
      cycle_ended_at: cycleEndedAt,
      pai: round(precision, 4),
      verified_count: verifiedCount,
      evaluated_count: evaluatedCount,
      precision: round(precision, 4),
      recall: round(
        actualHotspots > 0 ? verifiedCount / actualHotspots : recall,
        4,
      ),
      f1_score: round(f1, 4),
      threshold_before: threshold.threshold,
      threshold_after: threshold.threshold,
    })
    .select("*")
    .single();

  const recalculated = await recalculateZoneMetrics(supabase, zoneId);
  if (inserted?.id) {
    await supabase
      .from("prediction_cycle_metrics")
      .update({
        pai: recalculated.pai,
        threshold_after: recalculated.threshold.threshold,
      })
      .eq("id", inserted.id);
  }

  await optimizeAdaptiveWeights(supabase, {
    cycleStartedAt: cycleStart,
    cycleEndedAt,
    zoneId,
    actualHotspots,
  });

  return inserted;
}

function buildClusters(
  reports: PredictionContextReport[],
  weights: LocationWeightRow[] = [],
) {
  const now = Date.now();
  const weightMap = new Map(weights.map((weight) => [weight.geohash, weight]));
  const clusters = new Map<string, ClusterSummary>();

  for (const report of reports) {
    const geohash = ngeo.encode(report.latitude, report.longitude, 6);
    const category = normalizeCategory(
      report.confirmed_class || report.predicted_class,
    );
    const existing = clusters.get(geohash);
    const ageHours =
      (now - new Date(report.created_at).getTime()) / (1000 * 60 * 60);

    if (!existing) {
      const weight = weightMap.get(geohash);
      clusters.set(geohash, {
        geohash,
        latitude: report.latitude,
        longitude: report.longitude,
        reportCount: 1,
        latestReportAt: report.created_at,
        latestCategory: category,
        categoryCounts: { [category]: 1 },
        locationWeight: Number(weight?.weight_multiplier ?? 1),
        historicalVerificationRate:
          (weight?.total_predictions ?? 0) > 0
            ? (weight?.verified_predictions ?? 0) /
              Math.max(1, weight?.total_predictions ?? 1)
            : 0.5,
        reports: [report],
        dominantCategory: category,
        categoryDominance: 1,
        recent24hCount: ageHours <= 24 ? 1 : 0,
        recent72hCount: ageHours <= 72 ? 1 : 0,
        previous72hCount: ageHours > 72 && ageHours <= 144 ? 1 : 0,
        recent7dCount: ageHours <= 24 * 7 ? 1 : 0,
        recent30dCount: ageHours <= 24 * 30 ? 1 : 0,
        averageGapHours: null,
        hourConcentration: 0,
        dayConcentration: 0,
        peakHourUtc: new Date(report.created_at).getUTCHours(),
        peakWeekdayUtc: new Date(report.created_at).getUTCDay(),
        nearbySupportScore: 0,
        recurrenceScore: 0,
        momentumScore: 0,
        trendScore: 0,
        stalenessScore: 0,
        cadenceScore: 0,
      });
      continue;
    }

    existing.reportCount += 1;
    existing.reports.push(report);
    existing.categoryCounts[category] =
      (existing.categoryCounts[category] ?? 0) + 1;
    existing.recent24hCount += ageHours <= 24 ? 1 : 0;
    existing.recent72hCount += ageHours <= 72 ? 1 : 0;
    existing.previous72hCount += ageHours > 72 && ageHours <= 144 ? 1 : 0;
    existing.recent7dCount += ageHours <= 24 * 7 ? 1 : 0;
    existing.recent30dCount += ageHours <= 24 * 30 ? 1 : 0;

    if (
      new Date(report.created_at).getTime() >
      new Date(existing.latestReportAt).getTime()
    ) {
      existing.latestReportAt = report.created_at;
      existing.latestCategory = category;
      existing.latitude = report.latitude;
      existing.longitude = report.longitude;
    }
  }

  const clusterList = Array.from(clusters.values()).map((cluster) => {
    const dominant = getDominantCategory(cluster.categoryCounts);
    const temporal = getTemporalStats(cluster.reports);
    const ageHours =
      (now - new Date(cluster.latestReportAt).getTime()) / (1000 * 60 * 60);
    const recurrenceScore = clamp(
      cluster.recent30dCount >= 2
        ? cluster.recent7dCount / Math.max(2, cluster.recent30dCount)
        : 0,
      0,
      1,
    );
    const trendScore =
      clamp(
        cluster.previous72hCount > 0
          ? cluster.recent72hCount / cluster.previous72hCount
          : cluster.recent72hCount > 0
            ? 1
            : 0,
        0,
        2,
      ) / 2;
    const momentumScore =
      clamp(
        cluster.recent24hCount * 0.45 +
          cluster.recent72hCount * 0.35 +
          cluster.recent7dCount * 0.15 +
          cluster.recent30dCount * 0.05,
        0,
        4,
      ) / 4;
    const stalenessScore = clamp(1 - ageHours / (24 * 10), 0, 1);
    const cadenceScore =
      temporal.averageGapHours === null
        ? 0.35
        : clamp(
            1 - Math.min(temporal.averageGapHours, 24 * 14) / (24 * 14),
            0.2,
            1,
          );

    return {
      ...cluster,
      dominantCategory: dominant.category,
      categoryDominance: round(dominant.dominance, 3),
      averageGapHours: temporal.averageGapHours
        ? round(temporal.averageGapHours, 2)
        : null,
      hourConcentration: round(temporal.hourConcentration, 3),
      dayConcentration: round(temporal.dayConcentration, 3),
      peakHourUtc: temporal.peakHourUtc,
      peakWeekdayUtc: temporal.peakWeekdayUtc,
      recurrenceScore: round(recurrenceScore, 3),
      momentumScore: round(momentumScore, 3),
      trendScore: round(trendScore, 3),
      stalenessScore: round(stalenessScore, 3),
      cadenceScore: round(cadenceScore, 3),
    };
  });

  for (const cluster of clusterList) {
    let nearbySupport = 0;
    for (const other of clusterList) {
      if (other.geohash === cluster.geohash) {
        continue;
      }

      const distance = haversineKm(
        cluster.latitude,
        cluster.longitude,
        other.latitude,
        other.longitude,
      );

      if (distance <= HOTSPOT_NEARBY_RADIUS_KM) {
        nearbySupport +=
          clamp(other.reportCount / 6, 0, 1) *
          (1 - distance / HOTSPOT_NEARBY_RADIUS_KM);
      }
    }

    cluster.nearbySupportScore = round(clamp(nearbySupport, 0, 1), 3);
  }

  return clusterList.sort((a, b) => {
    const scoreA =
      a.momentumScore * 0.35 +
      a.trendScore * 0.15 +
      a.recurrenceScore * 0.2 +
      a.stalenessScore * 0.15 +
      a.historicalVerificationRate * 0.15 +
      a.nearbySupportScore * 0.1;
    const scoreB =
      b.momentumScore * 0.35 +
      b.trendScore * 0.15 +
      b.recurrenceScore * 0.2 +
      b.stalenessScore * 0.15 +
      b.historicalVerificationRate * 0.15 +
      b.nearbySupportScore * 0.1;
    return scoreB - scoreA;
  });
}

function buildDeterministicPredictions(
  clusters: ClusterSummary[],
  calibration: ModelCalibrationRow | null,
  adaptiveWeights: Awaited<ReturnType<typeof getAdaptiveWeights>>["weights"],
) {
  const calibrationMultiplier = Number(
    calibration?.current_accuracy_multiplier ?? 0.8,
  );

  return clusters
    .filter((cluster) => {
      const ageHours = hoursBetween(
        cluster.latestReportAt,
        new Date().toISOString(),
      );
      return (
        cluster.reportCount >= MIN_REPORTS_PER_CLUSTER &&
        ageHours <= 24 * 30 &&
        (cluster.recent72hCount > 0 || cluster.recent7dCount > 0)
      );
    })
    .slice(0, MAX_CANDIDATES)
    .map<PredictionCandidate>((cluster) => {
      const verificationFactor = clamp(
        cluster.historicalVerificationRate || 0.5,
        0.25,
        1,
      );
      const featureScores = buildAdaptiveFeatureScores(cluster);
      const baseConfidence = clamp(
        computeConfidence(featureScores, adaptiveWeights),
        0.18,
        0.97,
      );

      // Confidence interval: variance from sub-signal disagreement
      const featureValues = FEATURE_KEYS.map((k) => featureScores[k]);
      const featureMean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
      const featureVariance = featureValues.reduce((sum, v) => sum + (v - featureMean) ** 2, 0) / featureValues.length;
      const featureStdDev = Math.sqrt(featureVariance);
      // Wider interval for sparser data (fewer reports = more uncertainty)
      const sparsityFactor = clamp(1.5 / Math.sqrt(Math.max(cluster.reportCount, 1)), 0.3, 1.5);
      const intervalHalfWidth = clamp(featureStdDev * sparsityFactor + (1 - verificationFactor) * 0.1, 0.03, 0.25);
      const confidenceLower = clamp(baseConfidence - intervalHalfWidth, 0.05, baseConfidence);
      const confidenceUpper = clamp(baseConfidence + intervalHalfWidth, baseConfidence, 0.99);

      const urgencyBoost = clamp(cluster.recent24hCount / 3, 0, 0.18);
      const finalWeight = clamp(
        baseConfidence *
          (0.7 + Number(cluster.locationWeight || 1) * 0.3) *
          calibrationMultiplier *
          (1 +
            urgencyBoost +
            cluster.trendScore * 0.1 +
            verificationFactor * 0.05),
        0.18,
        1.7,
      );

      const reasonParts = [
        `${cluster.recent72hCount} reports in the last 72h`,
        `${cluster.previous72hCount} reports in the previous 72h`,
        `${cluster.recent7dCount} reports in the last 7d`,
        `${Math.round(cluster.categoryDominance * 100)}% ${cluster.dominantCategory} concentration`,
        `${Math.round(verificationFactor * 100)}% historical zone verification`,
        `confidence band: [${round(confidenceLower, 2)}–${round(confidenceUpper, 2)}]`,
      ];

      if (cluster.hourConcentration >= 0.3) {
        reasonParts.push(
          `repeats near ${String(cluster.peakHourUtc).padStart(2, "0")}:00 UTC`,
        );
      }

      return {
        geohash: cluster.geohash,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        predicted_category: cluster.dominantCategory,
        base_confidence: round(baseConfidence, 3),
        confidence_lower: round(confidenceLower, 3),
        confidence_upper: round(confidenceUpper, 3),
        final_weight: round(finalWeight, 3),
        target_date: getNextTargetDate(
          cluster.peakHourUtc,
          cluster.peakWeekdayUtc,
          cluster.dayConcentration,
        ),
        reason: reasonParts.join(", "),
        report_count: cluster.reportCount,
        feature_scores: featureScores,
        source: "deterministic",
      };
    });
}

async function getPredictionContext() {
  const supabase = createServiceClient();
  const [{ data: reports }, { data: weights }, { data: calibrationRows }] =
    await Promise.all([
      supabase
        .from("waste_reports")
        .select(
          "id, latitude, longitude, created_at, predicted_class, confirmed_class, neighborhood_id, status",
        )
        .order("created_at", { ascending: false })
        .limit(MAX_REPORTS_FOR_CONTEXT),
      supabase.from("location_weights").select("*"),
      supabase.from("model_calibration").select("*").limit(1),
    ]);

  return {
    supabase,
    reports: (reports ?? []) as PredictionContextReport[],
    weights: (weights ?? []) as LocationWeightRow[],
    calibration: (calibrationRows?.[0] ?? null) as ModelCalibrationRow | null,
  };
}

export async function expireMissedPredictions() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: expired } = await supabase
    .from(PREDICTION_TABLE)
    .select("*")
    .eq("status", "active")
    .lt("target_date", now);

  if (!expired || expired.length === 0) {
    return { expiredCount: 0 };
  }

  for (const prediction of expired) {
    const zoneId =
      prediction.geohash ||
      ngeo.encode(prediction.latitude, prediction.longitude, 6);
    await supabase
      .from(PREDICTION_TABLE)
      .update({
        status: "missed",
        metadata: {
          ...(prediction.metadata ?? {}),
          missed_at: now,
        },
      })
      .eq("id", prediction.id);

    await supabase.from("prediction_feedback_records").insert({
      prediction_id: prediction.id,
      zone_id: zoneId,
      status: "missed",
      evaluated_at: now,
      metadata: {
        source: prediction.metadata?.source ?? "prediction-expiry",
        features: (prediction.metadata as Record<string, unknown>)?.features,
      },
    });

    await updateFeedbackStats(zoneId, false);
    await recordFeedbackCycle(supabase, zoneId, now);
  }

  return { expiredCount: expired.length };
}

export async function generatePredictions(options?: {
  confidenceThreshold?: number;
  neighborhoodId?: string | null;
}) {
  const confidenceThreshold =
    options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const { supabase, reports, weights, calibration } =
    await getPredictionContext();
  const adaptiveWeights = await getAdaptiveWeights(supabase);
  await expireMissedPredictions();

  const scopedReports = options?.neighborhoodId
    ? reports.filter(
        (report) => report.neighborhood_id === options.neighborhoodId,
      )
    : reports;
  const activeFieldReports = scopedReports.filter((report) =>
    ["pending", "assigned", "in_progress"].includes(report.status),
  );

  const clusters = buildClusters(scopedReports, weights);
  if (clusters.length === 0) {
    return {
      predictions: [] as PredictedReportRow[],
      filteredOut: 0,
      candidateCount: 0,
      rescuedCount: 0,
      source: "none" as const,
      threshold: confidenceThreshold,
      weights: adaptiveWeights.weights,
    };
  }

  const candidates = buildDeterministicPredictions(
    clusters,
    calibration,
    adaptiveWeights.weights,
  );
  const filteredWithThresholds = await Promise.all(
    candidates.map(async (candidate) => {
      const thresholdRow = await getZoneThreshold(supabase, candidate.geohash);
      const effectiveThreshold = Math.max(
        confidenceThreshold - 0.08,
        thresholdRow.threshold - 0.05,
        0.45,
      );
      const accepted =
        candidate.base_confidence >= effectiveThreshold ||
        candidate.final_weight >= effectiveThreshold;
      const conflictsWithLiveReport = activeFieldReports.some((report) => {
        const distance = haversineKm(
          candidate.latitude,
          candidate.longitude,
          report.latitude,
          report.longitude,
        );
        const reportCategory = normalizeCategory(
          report.confirmed_class || report.predicted_class,
        );
        const categoryCompatible =
          reportCategory === candidate.predicted_category ||
          reportCategory === "mixed" ||
          candidate.predicted_category === "mixed";

        return distance <= LOCATION_RADIUS_KM * 0.75 && categoryCompatible;
      });

      return {
        candidate,
        threshold: effectiveThreshold,
        accepted: accepted && !conflictsWithLiveReport,
      };
    }),
  );

  let selectedRows = filteredWithThresholds.filter((row) => row.accepted);
  let rescuedCount = 0;

  if (selectedRows.length === 0 && filteredWithThresholds.length > 0) {
    selectedRows = [...filteredWithThresholds]
      .filter(
        (row) =>
          Math.max(row.candidate.base_confidence, row.candidate.final_weight) >=
          0.34,
      )
      .sort((a, b) => {
        const scoreA = Math.max(
          a.candidate.base_confidence,
          a.candidate.final_weight,
        );
        const scoreB = Math.max(
          b.candidate.base_confidence,
          b.candidate.final_weight,
        );
        return scoreB - scoreA;
      })
      .slice(0, Math.min(2, filteredWithThresholds.length));
    rescuedCount = selectedRows.length;
  }

  const filtered = selectedRows.map((row) => row.candidate);
  const { data: existingActiveRows } = await supabase
    .from(PREDICTION_TABLE)
    .select("*")
    .eq("status", "active");
  const existingActive = (existingActiveRows ?? []) as PredictedReportRow[];

  if (filtered.length === 0) {
    return {
      predictions: [] as PredictedReportRow[],
      filteredOut: candidates.length,
      candidateCount: candidates.length,
      rescuedCount,
      source: "deterministic" as const,
      threshold: confidenceThreshold,
      weights: adaptiveWeights.weights,
    };
  }

  const rows = filtered.map((prediction) => ({
    geohash: prediction.geohash,
    predicted_category: prediction.predicted_category,
    base_confidence: prediction.base_confidence,
    final_weight: prediction.final_weight,
    latitude: prediction.latitude,
    longitude: prediction.longitude,
    target_date: prediction.target_date,
    status: "active",
    metadata: {
      reason: prediction.reason,
      source: prediction.source,
      confidence_threshold:
        selectedRows.find((row) => row.candidate.geohash === prediction.geohash)
          ?.threshold ?? confidenceThreshold,
      confidence_lower: prediction.confidence_lower,
      confidence_upper: prediction.confidence_upper,
      report_count: prediction.report_count,
      features: prediction.feature_scores,
      rescued_from_threshold: rescuedCount > 0,
    },
  }));

  const usedExistingPredictionIds = new Set<string>();
  const refreshedRows: PredictedReportRow[] = [];
  let insertedCount = 0;

  for (const row of rows) {
    const existingMatch = existingActive.find((prediction) => {
      if (usedExistingPredictionIds.has(prediction.id)) {
        return false;
      }

      const distance = haversineKm(
        row.latitude,
        row.longitude,
        prediction.latitude,
        prediction.longitude,
      );
      const sameCategory =
        normalizeCategory(prediction.predicted_category) ===
          row.predicted_category ||
        normalizeCategory(prediction.predicted_category) === "mixed" ||
        row.predicted_category === "mixed";

      return distance <= PREDICTION_REFRESH_RADIUS_KM && sameCategory;
    });

    if (existingMatch) {
      const { data: updated, error } = await supabase
        .from(PREDICTION_TABLE)
        .update({
          geohash: row.geohash,
          predicted_category: row.predicted_category,
          base_confidence: row.base_confidence,
          final_weight: row.final_weight,
          latitude: row.latitude,
          longitude: row.longitude,
          target_date: row.target_date,
          metadata: {
            ...((existingMatch.metadata as Record<string, unknown>) ?? {}),
            ...((row.metadata as Record<string, unknown>) ?? {}),
            refreshed_at: new Date().toISOString(),
          },
        })
        .eq("id", existingMatch.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      usedExistingPredictionIds.add(existingMatch.id);
      if (updated) {
        refreshedRows.push(updated as PredictedReportRow);
      }
      continue;
    }

    const { data: inserted, error } = await supabase
      .from(PREDICTION_TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error) {
      throw error;
    }

    insertedCount += 1;
    if (inserted) {
      refreshedRows.push(inserted as PredictedReportRow);
    }
  }

  if (insertedCount > 0) {
    if (calibration?.id) {
      const nextGenerated =
        (calibration.total_predictions_generated ?? 0) + insertedCount;
      await supabase
        .from("model_calibration")
        .update({
          total_predictions_generated: nextGenerated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", calibration.id);
    } else {
      await supabase.from("model_calibration").insert({
        total_predictions_generated: insertedCount,
        total_predictions_verified: 0,
        current_accuracy_multiplier: 0.8,
      });
    }
  }

  return {
    predictions: refreshedRows,
    filteredOut: candidates.length - filtered.length,
    candidateCount: candidates.length,
    rescuedCount,
    source: "deterministic" as const,
    threshold: confidenceThreshold,
    weights: adaptiveWeights.weights,
  };
}

export async function updateFeedbackStats(geohash: string, verified: boolean) {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("location_weights")
    .select("*")
    .eq("geohash", geohash)
    .single();

  const totalPredictions = (existing?.total_predictions ?? 0) + 1;
  const verifiedPredictions =
    (existing?.verified_predictions ?? 0) + (verified ? 1 : 0);
  const verificationRate = verifiedPredictions / Math.max(1, totalPredictions);
  const nextWeight = clamp(0.6 + verificationRate, 0.6, 1.6);

  await supabase.from("location_weights").upsert({
    geohash,
    lat_grid: existing?.lat_grid ?? 0,
    lng_grid: existing?.lng_grid ?? 0,
    weight_multiplier: round(nextWeight, 2),
    total_predictions: totalPredictions,
    verified_predictions: verifiedPredictions,
    updated_at: new Date().toISOString(),
  });

  const { data: calibration } = await supabase
    .from("model_calibration")
    .select("*")
    .limit(1)
    .single();
  if (calibration) {
    const nextVerified =
      (calibration.total_predictions_verified ?? 0) + (verified ? 1 : 0);
    const generated = Math.max(1, calibration.total_predictions_generated ?? 0);
    const multiplier = clamp(nextVerified / generated, 0.3, 1.2);

    await supabase
      .from("model_calibration")
      .update({
        total_predictions_verified: nextVerified,
        current_accuracy_multiplier: round(multiplier, 2),
        updated_at: new Date().toISOString(),
      })
      .eq("id", calibration.id);
  }
}

export async function verifyPredictionForReport(
  report: Pick<
    WasteReportRow,
    | "id"
    | "latitude"
    | "longitude"
    | "created_at"
    | "confirmed_class"
    | "predicted_class"
  >,
) {
  const supabase = createServiceClient();
  const reportCategory = normalizeCategory(
    report.confirmed_class || report.predicted_class,
  );
  const { data: activePredictions } = await supabase
    .from(PREDICTION_TABLE)
    .select("*")
    .eq("status", "active");

  const matching = ((activePredictions ?? []) as PredictedReportRow[])
    .map((prediction: PredictedReportRow) => {
      const distance = haversineKm(
        report.latitude,
        report.longitude,
        prediction.latitude,
        prediction.longitude,
      );
      const predictedCategory = normalizeCategory(
        prediction.predicted_category,
      );
      const categoryScore =
        predictedCategory === reportCategory
          ? 1
          : predictedCategory === "mixed"
            ? 0.7
            : 0;
      const distanceScore = clamp(1 - distance / LOCATION_RADIUS_KM, 0, 1);
      const timeScore = clamp(
        1 -
          hoursBetween(report.created_at, prediction.target_date) /
            FEEDBACK_WINDOW_HOURS,
        0,
        1,
      );
      const weightScore = clamp((prediction.final_weight ?? 0) / 1.7, 0, 1);
      const matchScore =
        distanceScore * 0.5 +
        categoryScore * 0.3 +
        timeScore * 0.2 +
        weightScore * 0.1;

      return { prediction, distance, matchScore, categoryScore };
    })
    .filter(
      (entry) =>
        entry.distance <= LOCATION_RADIUS_KM && entry.categoryScore > 0,
    )
    .sort((a, b) => b.matchScore - a.matchScore)[0];

  if (!matching || matching.matchScore < 0.45) {
    return null;
  }

  await supabase
    .from(PREDICTION_TABLE)
    .update({
      status: "verified",
      matched_report_id: report.id,
      metadata: {
        ...((matching.prediction.metadata ?? {}) as Record<string, unknown>),
        verified_at: new Date().toISOString(),
        matched_category: reportCategory,
        match_score: round(matching.matchScore, 3),
      },
    })
    .eq("id", matching.prediction.id);

  const zoneId =
    matching.prediction.geohash ||
    ngeo.encode(matching.prediction.latitude, matching.prediction.longitude, 6);
  const distanceMeters = matching.distance * 1000;
  const timeDeltaMinutes =
    hoursBetween(report.created_at, matching.prediction.target_date) * 60;

  await supabase.from("prediction_feedback_records").insert({
    prediction_id: matching.prediction.id,
    zone_id: zoneId,
    report_id: report.id,
    status: "verified",
    distance_meters: round(distanceMeters, 2),
    time_delta_minutes: round(timeDeltaMinutes, 2),
    evaluated_at: new Date().toISOString(),
    metadata: {
      matched_category: reportCategory,
      match_score: round(matching.matchScore, 3),
      features: (matching.prediction.metadata as Record<string, unknown>)
        ?.features,
    },
  });

  await updateFeedbackStats(zoneId, true);
  await recordFeedbackCycle(supabase, zoneId, new Date().toISOString());

  return matching.prediction.id;
}

export async function getPredictionSummary() {
  const supabase = createServiceClient();
  await expireMissedPredictions();
  const adaptiveWeights = await getAdaptiveWeights(supabase);

  const [
    { data: predictions },
    { data: calibration },
    { data: weights },
    { data: thresholds },
    { data: cycles },
  ] = await Promise.all([
    supabase
      .from(PREDICTION_TABLE)
      .select("*")
      .order("final_weight", { ascending: false }),
    supabase.from("model_calibration").select("*").limit(1).single(),
    supabase.from("location_weights").select("*"),
    supabase.from("prediction_thresholds").select("*"),
    supabase
      .from("prediction_cycle_metrics")
      .select("*")
      .order("cycle_ended_at", { ascending: false })
      .limit(20),
  ]);

  const typedWeights = (weights ?? []) as LocationWeightRow[];
  const totalLocationPredictions = typedWeights.reduce(
    (sum, row) => sum + (row.total_predictions ?? 0),
    0,
  );
  const totalLocationVerified = typedWeights.reduce(
    (sum, row) => sum + (row.verified_predictions ?? 0),
    0,
  );
  const accuracy =
    totalLocationPredictions > 0
      ? round((totalLocationVerified / totalLocationPredictions) * 100, 1)
      : null;

  return {
    predictions: (predictions ?? []) as PredictedReportRow[],
    metrics: {
      active: ((predictions ?? []) as PredictedReportRow[]).filter(
        (prediction) => prediction.status === "active",
      ).length,
      verified: ((predictions ?? []) as PredictedReportRow[]).filter(
        (prediction) => prediction.status === "verified",
      ).length,
      missed: ((predictions ?? []) as PredictedReportRow[]).filter(
        (prediction) => prediction.status === "missed",
      ).length,
      accuracy,
      calibrationMultiplier: calibration?.current_accuracy_multiplier ?? 0.8,
      threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      adaptiveWeights: adaptiveWeights.weights,
      adaptiveIteration: adaptiveWeights.row.iteration ?? 0,
      thresholds: (thresholds ?? []) as PredictionThresholdRow[],
      paiHistory: (cycles ?? []) as PredictionCycleMetricRow[],
    },
  };
}

export async function getRouteReadyPredictions() {
  const { predictions } = await getPredictionSummary();

  return predictions.filter(
    (prediction) =>
      prediction.status === "active" &&
      ((prediction.base_confidence ?? 0) >= DEFAULT_CONFIDENCE_THRESHOLD ||
        (prediction.final_weight ?? 0) >= DEFAULT_CONFIDENCE_THRESHOLD),
  );
}

export async function getPredictionGeoJson() {
  const { predictions, metrics } = await getPredictionSummary();

  return {
    type: "FeatureCollection",
    features: predictions
      .filter((prediction) => prediction.status === "active")
      .map((prediction) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [prediction.longitude, prediction.latitude],
        },
        properties: {
          id: prediction.id,
          zoneId: prediction.geohash,
          confidence: prediction.base_confidence,
          weight: prediction.final_weight,
          predictedCategory: prediction.predicted_category,
          targetDate: prediction.target_date,
          reason: (prediction.metadata as Record<string, unknown>)?.reason,
        },
      })),
    meta: {
      threshold: metrics.threshold,
      calibrationMultiplier: metrics.calibrationMultiplier,
    },
  };
}
