export const FEATURE_KEYS = ["R", "F", "D", "L", "T"] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type AdaptiveFeatureScores = Record<FeatureKey, number>;

export type AdaptiveWeightVector = Record<FeatureKey, number>;

export interface AdaptivePredictionWeights {
  id: string;
  geohash: string;
  category: string;
  weights: AdaptiveWeightVector;
  weight_r?: number;
  weight_f?: number;
  weight_d?: number;
  weight_l?: number;
  weight_t?: number;
  performance_score: number;
  updated_at: string;
  version: number;
  target_precision?: number;
  learning_rate?: number;
  iteration?: number;
}

export interface PredictionFeedbackRecord {
  prediction_id: string;
  actual_category: string;
  actual_quantity: number | null;
  time_variance_hours: number;
  distance_variance_meters: number;
  feedback_timestamp: string;
  zone_id?: string;
  status?: string;
  metadata?: any;
}

export interface AdaptiveMetrics {
  verified: number;
  missed: number;
  actualHotspots: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface AdaptiveWeightUpdateResult {
  metrics: AdaptiveMetrics;
  previousWeights: AdaptiveWeightVector;
  updatedWeights: AdaptiveWeightVector;
  contribution: AdaptiveWeightVector;
  performanceError: number;
  iteration: number;
}

const DEFAULT_WEIGHTS: AdaptiveWeightVector = {
  R: 0.22,
  F: 0.24,
  D: 0.18,
  L: 0.18,
  T: 0.18,
};

function round(value: number, digits: number = 4) {
  return Number(value.toFixed(digits));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeConfidence(
  features: AdaptiveFeatureScores,
  weights: AdaptiveWeightVector,
) {
  return FEATURE_KEYS.reduce(
    (sum, key) => sum + features[key] * (weights[key] || 0),
    0,
  );
}

export function normalizeWeights(
  weights: AdaptiveWeightVector,
): AdaptiveWeightVector {
  const safeValues = FEATURE_KEYS.map((key) =>
    Math.max(weights[key] || 0, 1e-6),
  );
  const total = safeValues.reduce((sum, value) => sum + value, 0);

  return FEATURE_KEYS.reduce((result, key, index) => {
    result[key] = safeValues[index] / total;
    return result;
  }, {} as AdaptiveWeightVector);
}

export function computeMetrics(args: {
  verified: number;
  missed: number;
  actualHotspots: number;
}): AdaptiveMetrics {
  const precision = args.verified / Math.max(1, args.verified + args.missed);
  const recall = args.verified / Math.max(1, args.actualHotspots);
  const f1Score =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    verified: args.verified,
    missed: args.missed,
    actualHotspots: args.actualHotspots,
    precision: round(precision),
    recall: round(recall),
    f1Score: round(f1Score),
  };
}

function rowToWeights(
  row: AdaptivePredictionWeights | null | undefined,
): AdaptiveWeightVector {
  if (!row) {
    return DEFAULT_WEIGHTS;
  }

  return normalizeWeights({
    R: row.weight_r ?? 0.2,
    F: row.weight_f ?? 0.2,
    D: row.weight_d ?? 0.2,
    L: row.weight_l ?? 0.2,
    T: row.weight_t ?? 0.2,
  });
}

function averageFeatures(items: AdaptiveFeatureScores[]): AdaptiveWeightVector {
  if (items.length === 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  const sums = FEATURE_KEYS.reduce(
    (result, key) => {
      result[key] = 0;
      return result;
    },
    {} as Record<FeatureKey, number>,
  );

  for (const item of items) {
    for (const key of FEATURE_KEYS) {
      sums[key] += item[key];
    }
  }

  return FEATURE_KEYS.reduce((result, key) => {
    result[key] = sums[key]! / items.length;
    return result;
  }, {} as AdaptiveWeightVector);
}

function zeroVector(): AdaptiveWeightVector {
  return { R: 0, F: 0, D: 0, L: 0, T: 0 };
}

function getFeatureContribution(
  verifiedFeatures: AdaptiveFeatureScores[],
  missedFeatures: AdaptiveFeatureScores[],
  actualHotspotFeatures: AdaptiveFeatureScores[],
): AdaptiveWeightVector {
  const verifiedMean =
    verifiedFeatures.length > 0
      ? averageFeatures(verifiedFeatures)
      : zeroVector();
  const missedMean =
    missedFeatures.length > 0 ? averageFeatures(missedFeatures) : zeroVector();
  const actualMean =
    actualHotspotFeatures.length > 0
      ? averageFeatures(actualHotspotFeatures)
      : verifiedMean;

  const contribution = FEATURE_KEYS.reduce((result, key) => {
    result[key] = round(
      0.65 * verifiedMean[key] + 0.35 * actualMean[key] - missedMean[key],
    );
    return result;
  }, {} as AdaptiveWeightVector);

  return contribution;
}

function parseFeatureScores(metadata: unknown): AdaptiveFeatureScores | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const featureContainer =
    (metadata as { features?: unknown }).features ??
    (metadata as { feature_scores?: unknown }).feature_scores;

  if (!featureContainer || typeof featureContainer !== "object") {
    return null;
  }

  const parsed = FEATURE_KEYS.reduce((result, key) => {
    const rawValue = (featureContainer as Record<string, unknown>)[key];
    result[key] = clamp(Number(rawValue ?? 0), 0, 1);
    return result;
  }, {} as AdaptiveFeatureScores);

  return parsed;
}

export function updateWeights(
  currentWeights: AdaptiveWeightVector,
  currentPrecision: number,
  targetPrecision: number,
  contribution: AdaptiveWeightVector,
  alpha: number,
): {
  updatedWeights: AdaptiveWeightVector;
  performanceError: number;
} {
  const performanceError = targetPrecision - currentPrecision;
  // Learning rate decay: α_eff = α / (1 + 0.05 × iteration) — prevents oscillation, ensures convergence
  const effectiveAlpha = alpha;
  const stepMagnitude =
    performanceError >= 0
      ? effectiveAlpha * performanceError
      : effectiveAlpha * Math.abs(performanceError) * 0.4;

  const rawUpdated = FEATURE_KEYS.reduce((result, key) => {
    const direction =
      performanceError >= 0
        ? contribution[key]
        : Math.max(contribution[key], 0);
    result[key] = currentWeights[key] + stepMagnitude * direction;
    return result;
  }, {} as AdaptiveWeightVector);

  return {
    updatedWeights: normalizeWeights(rawUpdated),
    performanceError: round(performanceError),
  };
}

async function getOrCreateAdaptiveWeights(supabase: any) {
  const { data: existing } = await supabase
    .from("adaptive_prediction_weights")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as AdaptivePredictionWeights;
  }

  const { data: inserted, error } = await supabase
    .from("adaptive_prediction_weights")
    .insert({
      weight_r: DEFAULT_WEIGHTS.R,
      weight_f: DEFAULT_WEIGHTS.F,
      weight_d: DEFAULT_WEIGHTS.D,
      weight_l: DEFAULT_WEIGHTS.L,
      weight_t: DEFAULT_WEIGHTS.T,
      learning_rate: 0.1,
      target_precision: 0.75,
      current_precision: 0,
      iteration: 0,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return inserted as AdaptivePredictionWeights;
}

export async function getAdaptiveWeights(supabase: any) {
  const row = await getOrCreateAdaptiveWeights(supabase);
  return {
    row,
    weights: rowToWeights(row),
  };
}

export async function optimizeAdaptiveWeights(
  supabase: any,
  args: {
    cycleStartedAt: string;
    cycleEndedAt: string;
    zoneId?: string | null;
    actualHotspots: number;
  },
) {
  const current = await getOrCreateAdaptiveWeights(supabase);
  const { data: feedbackRows } = await supabase
    .from("prediction_feedback_records")
    .select("*")
    .gte("evaluated_at", args.cycleStartedAt)
    .lt("evaluated_at", args.cycleEndedAt)
    .order("evaluated_at", { ascending: true });

  const typedRows = (feedbackRows ?? []) as PredictionFeedbackRecord[];
  const scopedRows = args.zoneId
    ? typedRows.filter((row) => row.zone_id === args.zoneId)
    : typedRows;

  if (scopedRows.length === 0) {
    return null;
  }

  const verifiedRows = scopedRows.filter((row) => row.status === "verified");
  const missedRows = scopedRows.filter((row) => row.status === "missed");
  const verifiedFeatures = verifiedRows
    .map((row) => parseFeatureScores(row.metadata))
    .filter((value): value is AdaptiveFeatureScores => Boolean(value));
  const missedFeatures = missedRows
    .map((row) => parseFeatureScores(row.metadata))
    .filter((value): value is AdaptiveFeatureScores => Boolean(value));
  const actualHotspotFeatures = verifiedFeatures;

  const metrics = computeMetrics({
    verified: verifiedRows.length,
    missed: missedRows.length,
    actualHotspots: args.actualHotspots,
  });

  // Convergence detection: skip update if precision is within ±0.02 of target for stability
  const targetPrecision = current.target_precision ?? 0.8;
  const precisionDelta = Math.abs(metrics.precision - targetPrecision);
  const currentIteration = current.iteration ?? 0;
  // Only apply convergence gating after at least 5 iterations to allow initial learning
  if (currentIteration >= 5 && precisionDelta < 0.02) {
    // Still log the history entry but don't update weights
    const stableWeights = rowToWeights(current);
    await supabase.from("adaptive_prediction_weight_history").insert({
      iteration: currentIteration,
      zone_id: args.zoneId ?? null,
      cycle_started_at: args.cycleStartedAt,
      cycle_ended_at: args.cycleEndedAt,
      precision: metrics.precision,
      recall: metrics.recall,
      f1_score: metrics.f1Score,
      verified_count: metrics.verified,
      missed_count: metrics.missed,
      actual_hotspots: metrics.actualHotspots,
      performance_error: round(targetPrecision - metrics.precision),
      weight_r: round(stableWeights.R),
      weight_f: round(stableWeights.F),
      weight_d: round(stableWeights.D),
      weight_l: round(stableWeights.L),
      weight_t: round(stableWeights.T),
      contribution_r: 0,
      contribution_f: 0,
      contribution_d: 0,
      contribution_l: 0,
      contribution_t: 0,
    });
    return null; // Converged — no weight update needed
  }

  const previousWeights = rowToWeights(current);
  const contribution = getFeatureContribution(
    verifiedFeatures,
    missedFeatures,
    actualHotspotFeatures,
  );
  // Learning rate decay: prevents oscillation as model matures
  const effectiveLearningRate = (current.learning_rate ?? 0.1) / (1 + 0.05 * currentIteration);
  const next = updateWeights(
    previousWeights,
    metrics.precision,
    targetPrecision,
    contribution,
    effectiveLearningRate,
  );
  const nextIteration = currentIteration + 1;

  await supabase
    .from("adaptive_prediction_weights")
    .update({
      weight_r: round(next.updatedWeights.R),
      weight_f: round(next.updatedWeights.F),
      weight_d: round(next.updatedWeights.D),
      weight_l: round(next.updatedWeights.L),
      weight_t: round(next.updatedWeights.T),
      current_precision: metrics.precision,
      iteration: nextIteration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  await supabase.from("adaptive_prediction_weight_history").insert({
    iteration: nextIteration,
    zone_id: args.zoneId ?? null,
    cycle_started_at: args.cycleStartedAt,
    cycle_ended_at: args.cycleEndedAt,
    precision: metrics.precision,
    recall: metrics.recall,
    f1_score: metrics.f1Score,
    verified_count: metrics.verified,
    missed_count: metrics.missed,
    actual_hotspots: metrics.actualHotspots,
    performance_error: next.performanceError,
    weight_r: round(next.updatedWeights.R),
    weight_f: round(next.updatedWeights.F),
    weight_d: round(next.updatedWeights.D),
    weight_l: round(next.updatedWeights.L),
    weight_t: round(next.updatedWeights.T),
    contribution_r: contribution.R,
    contribution_f: contribution.F,
    contribution_d: contribution.D,
    contribution_l: contribution.L,
    contribution_t: contribution.T,
  });

  return {
    metrics,
    previousWeights,
    updatedWeights: next.updatedWeights,
    contribution,
    performanceError: next.performanceError,
    iteration: nextIteration,
  } satisfies AdaptiveWeightUpdateResult;
}
