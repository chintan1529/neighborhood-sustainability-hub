// ═══════════════════════════════════════════════════════════════════════════
// Dynamic Waste Priority Engine
// Multi-factor scoring system for ranking waste reports by urgency
// ═══════════════════════════════════════════════════════════════════════════

import { haversineKm } from "@/lib/utils";

// ───── SLA Configuration ─────
export const SLA_CONFIG = {
  TARGET_HOURS: 24,
  WARNING_HOURS: 18,
  CRITICAL_HOURS: 22,
  BREACH_PENALTY: 0.15, // Extra score added after SLA breach
} as const;

// ───── Types ─────
export interface PriorityInput {
  id: string;
  wasteType: string;
  createdAt: string;
  quantity?: string | null;
  latitude?: number;
  longitude?: number;
  predictionConfidence?: number | null;
  status?: string;
}

export interface PriorityResult {
  score: number; // 0–100
  tier: PriorityTier;
  color: string;
  bgColor: string;
  borderColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  icon: string;
  reasons: string[];
  slaStatus: SLAStatus;
  hoursRemaining: number;
  breakdown: PriorityBreakdown;
}

export interface PriorityBreakdown {
  wasteTypeScore: number;
  ageScore: number;
  quantityScore: number;
  densityScore: number;
  confidenceScore: number;
}

export type PriorityTier = "critical" | "high" | "medium" | "low";
export type SLAStatus = "safe" | "warning" | "critical" | "breached";

// ───── Waste Type Urgency Scores ─────
const WASTE_URGENCY: Record<string, number> = {
  organic: 0.95, // Decays fast, attracts pests
  mixed: 0.75, // Unknown contents, potentially hazardous
  plastic: 0.6, // Environmentally harmful
  metal: 0.55, // Stable but can be sharp/dangerous
  glass: 0.5, // Safety hazard if broken
  cardboard: 0.45, // Stable, low urgency
  paper: 0.4, // Most stable, lowest urgency
};

// ───── Tier Configuration ─────
const TIER_CONFIG: Record<
  PriorityTier,
  {
    min: number;
    color: string;
    bgColor: string;
    borderColor: string;
    darkBgColor: string;
    darkBorderColor: string;
    icon: string;
  }
> = {
  critical: {
    min: 75,
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    darkBgColor: "dark:bg-red-950/30",
    darkBorderColor: "dark:border-red-800",
    icon: "🔴",
  },
  high: {
    min: 55,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    darkBgColor: "dark:bg-amber-950/30",
    darkBorderColor: "dark:border-amber-800",
    icon: "🟠",
  },
  medium: {
    min: 35,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    darkBgColor: "dark:bg-blue-950/30",
    darkBorderColor: "dark:border-blue-800",
    icon: "🔵",
  },
  low: {
    min: 0,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    darkBgColor: "dark:bg-emerald-950/30",
    darkBorderColor: "dark:border-emerald-800",
    icon: "🟢",
  },
};

// ───── Core Scoring Functions ─────

function scoreWasteType(wasteType: string): {
  score: number;
  reason: string | null;
} {
  const s = WASTE_URGENCY[wasteType] || 0.5;
  return {
    score: s,
    reason: s >= 0.75 ? `${wasteType} waste — urgent` : null,
  };
}

function scoreAge(createdAt: string): {
  score: number;
  reason: string | null;
  slaStatus: SLAStatus;
  hoursRemaining: number;
} {
  const hoursOld =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, SLA_CONFIG.TARGET_HOURS - hoursOld);

  let slaStatus: SLAStatus = "safe";
  let score = Math.min(hoursOld / SLA_CONFIG.TARGET_HOURS, 1);
  let reason: string | null = null;

  if (hoursOld >= SLA_CONFIG.TARGET_HOURS) {
    slaStatus = "breached";
    score = 1.0 + SLA_CONFIG.BREACH_PENALTY;
    reason = `SLA breached — ${Math.round(hoursOld)}h old`;
  } else if (hoursOld >= SLA_CONFIG.CRITICAL_HOURS) {
    slaStatus = "critical";
    reason = `SLA critical — ${Math.round(hoursRemaining)}h left`;
  } else if (hoursOld >= SLA_CONFIG.WARNING_HOURS) {
    slaStatus = "warning";
    reason = `SLA warning — ${Math.round(hoursRemaining)}h left`;
  }

  return { score: Math.min(score, 1.15), reason, slaStatus, hoursRemaining };
}

function scoreQuantity(quantity: string | null | undefined): {
  score: number;
  reason: string | null;
} {
  if (!quantity) return { score: 0.5, reason: null };

  const q = quantity.toLowerCase();
  if (
    q.includes("large") ||
    q.includes("many") ||
    q.includes("bulk") ||
    /[3-9]/.test(q) ||
    q.includes("10")
  ) {
    return { score: 0.9, reason: "large quantity" };
  }
  if (q.includes("medium") || q.includes("2") || q.includes("several")) {
    return { score: 0.7, reason: null };
  }
  return { score: 0.5, reason: null };
}

function scoreConfidence(confidence: number | null | undefined): {
  score: number;
  reason: string | null;
} {
  if (confidence == null) return { score: 0.5, reason: null };
  // Lower confidence = higher priority (needs manual verification)
  const inverted = 1 - confidence;
  return {
    score: inverted,
    reason: confidence < 0.5 ? "low AI confidence — needs verify" : null,
  };
}

// ───── Density Scoring ─────
function scoreDensity(
  report: PriorityInput,
  allReports: PriorityInput[],
  radiusKm: number = 0.5,
): { score: number; reason: string | null; nearbyCount: number } {
  if (!report.latitude || !report.longitude) {
    return { score: 0.5, reason: null, nearbyCount: 0 };
  }

  let nearbyCount = 0;
  for (const other of allReports) {
    if (other.id === report.id || !other.latitude || !other.longitude) continue;
    const dist = haversineKm(
      report.latitude,
      report.longitude,
      other.latitude,
      other.longitude,
    );
    if (dist <= radiusKm) nearbyCount++;
  }

  // More nearby reports = higher cluster priority (efficient to collect together)
  const score = Math.min(nearbyCount / 5, 1); // Caps at 5 nearby
  return {
    score,
    reason:
      nearbyCount >= 2 ? `cluster of ${nearbyCount + 1} nearby reports` : null,
    nearbyCount,
  };
}

// ───── Main Calculate Function ─────
export function calculatePriority(
  report: PriorityInput,
  allReports: PriorityInput[] = [],
): PriorityResult {
  const wasteResult = scoreWasteType(report.wasteType);
  const ageResult = scoreAge(report.createdAt);
  const quantityResult = scoreQuantity(report.quantity);
  const densityResult = scoreDensity(report, allReports);
  const confidenceResult = scoreConfidence(report.predictionConfidence);

  // Weighted score (0–1 range, can exceed 1 due to SLA breach penalty)
  const rawScore =
    wasteResult.score * 0.3 +
    ageResult.score * 0.3 +
    quantityResult.score * 0.15 +
    densityResult.score * 0.15 +
    confidenceResult.score * 0.1;

  // Convert to 0–100 scale, clamped
  const score = Math.min(Math.round(rawScore * 100), 100);

  // Determine tier
  const tier = getPriorityTier(score);
  const tierConfig = TIER_CONFIG[tier];

  // Collect reasons
  const reasons: string[] = [];
  if (wasteResult.reason) reasons.push(wasteResult.reason);
  if (ageResult.reason) reasons.push(ageResult.reason);
  if (quantityResult.reason) reasons.push(quantityResult.reason);
  if (densityResult.reason) reasons.push(densityResult.reason);
  if (confidenceResult.reason) reasons.push(confidenceResult.reason);
  if (reasons.length === 0) reasons.push("standard priority");

  return {
    score,
    tier,
    color: tierConfig.color,
    bgColor: tierConfig.bgColor,
    borderColor: tierConfig.borderColor,
    darkBgColor: tierConfig.darkBgColor,
    darkBorderColor: tierConfig.darkBorderColor,
    icon: tierConfig.icon,
    reasons,
    slaStatus: ageResult.slaStatus,
    hoursRemaining: Math.round(ageResult.hoursRemaining * 10) / 10,
    breakdown: {
      wasteTypeScore: Math.round(wasteResult.score * 100),
      ageScore: Math.round(Math.min(ageResult.score, 1) * 100),
      quantityScore: Math.round(quantityResult.score * 100),
      densityScore: Math.round(densityResult.score * 100),
      confidenceScore: Math.round(confidenceResult.score * 100),
    },
  };
}

// ───── Batch Scoring ─────
export function calculateBatchPriority(
  reports: PriorityInput[],
): Map<string, PriorityResult> {
  const results = new Map<string, PriorityResult>();
  for (const report of reports) {
    results.set(report.id, calculatePriority(report, reports));
  }
  return results;
}

// ───── Tier Helpers ─────
export function getPriorityTier(score: number): PriorityTier {
  if (score >= TIER_CONFIG.critical.min) return "critical";
  if (score >= TIER_CONFIG.high.min) return "high";
  if (score >= TIER_CONFIG.medium.min) return "medium";
  return "low";
}

export function getTierLabel(tier: PriorityTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function getSLAColor(status: SLAStatus): string {
  switch (status) {
    case "breached":
      return "text-red-600 dark:text-red-400";
    case "critical":
      return "text-red-500 dark:text-red-400";
    case "warning":
      return "text-amber-500 dark:text-amber-400";
    default:
      return "text-emerald-500 dark:text-emerald-400";
  }
}
