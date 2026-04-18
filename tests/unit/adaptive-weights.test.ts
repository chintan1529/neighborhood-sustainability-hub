/**
 * Adaptive Weight Optimizer Unit Tests
 * Tests the online gradient-based learning system for prediction weights.
 */
import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  type AdaptiveFeatureScores,
} from "@/lib/adaptive-weight-optimizer";

// ── Default weights (matches production defaults) ──
const DEFAULT_WEIGHTS = {
  R: 0.22, // Recency
  F: 0.24, // Frequency
  D: 0.18, // Category dominance
  L: 0.18, // Location
  T: 0.18, // Temporal
};

// ── computeConfidence tests ──

describe("computeConfidence", () => {
  it("should return a value between 0 and 1", () => {
    const scores: AdaptiveFeatureScores = {
      R: 0.8,
      F: 0.6,
      D: 0.5,
      L: 0.7,
      T: 0.4,
    };

    const result = computeConfidence(scores, DEFAULT_WEIGHTS);

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("should return 1.0 for perfect scores across all features", () => {
    const perfectScores: AdaptiveFeatureScores = {
      R: 1.0,
      F: 1.0,
      D: 1.0,
      L: 1.0,
      T: 1.0,
    };

    const result = computeConfidence(perfectScores, DEFAULT_WEIGHTS);

    expect(result).toBe(1.0);
  });

  it("should return 0.0 for zero scores across all features", () => {
    const zeroScores: AdaptiveFeatureScores = {
      R: 0,
      F: 0,
      D: 0,
      L: 0,
      T: 0,
    };

    const result = computeConfidence(zeroScores, DEFAULT_WEIGHTS);

    expect(result).toBe(0);
  });

  it("should weight frequency higher than dominance (default weights)", () => {
    // Only frequency scored
    const freqOnly: AdaptiveFeatureScores = {
      R: 0,
      F: 1.0,
      D: 0,
      L: 0,
      T: 0,
    };

    // Only dominance scored
    const domOnly: AdaptiveFeatureScores = {
      R: 0,
      F: 0,
      D: 1.0,
      L: 0,
      T: 0,
    };

    const freqResult = computeConfidence(freqOnly, DEFAULT_WEIGHTS);
    const domResult = computeConfidence(domOnly, DEFAULT_WEIGHTS);

    // Frequency weight (0.24) > Dominance weight (0.18)
    expect(freqResult).toBeGreaterThan(domResult);
  });

  it("should respond proportionally to individual feature changes", () => {
    const base: AdaptiveFeatureScores = {
      R: 0.5,
      F: 0.5,
      D: 0.5,
      L: 0.5,
      T: 0.5,
    };

    const boostedRecency: AdaptiveFeatureScores = {
      ...base,
      R: 1.0,
    };

    const baseResult = computeConfidence(base, DEFAULT_WEIGHTS);
    const boostedResult = computeConfidence(boostedRecency, DEFAULT_WEIGHTS);

    // Boosting recency from 0.5 to 1.0 should increase score by weight_r * 0.5
    expect(boostedResult).toBeGreaterThan(baseResult);
    expect(boostedResult - baseResult).toBeCloseTo(DEFAULT_WEIGHTS.R * 0.5, 2);
  });
});

// ── Weight normalization ──

describe("Weight normalization", () => {
  it("should have default weights that sum to 1.0", () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("should handle custom weights that sum to 1.0", () => {
    const customWeights = {
      R: 0.3,
      F: 0.3,
      D: 0.15,
      L: 0.15,
      T: 0.1,
    };

    const sum = Object.values(customWeights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);

    const scores: AdaptiveFeatureScores = {
      R: 0.8,
      F: 0.6,
      D: 0.5,
      L: 0.7,
      T: 0.4,
    };

    const result = computeConfidence(scores, customWeights);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ── Edge cases ──

describe("Edge cases", () => {
  it("should handle a single high feature with zeros elsewhere", () => {
    const singleFeature: AdaptiveFeatureScores = {
      R: 1.0,
      F: 0,
      D: 0,
      L: 0,
      T: 0,
    };

    const result = computeConfidence(singleFeature, DEFAULT_WEIGHTS);

    // Should equal just the recency weight
    expect(result).toBeCloseTo(DEFAULT_WEIGHTS.R, 5);
  });

  it("should produce consistent results for the same inputs", () => {
    const scores: AdaptiveFeatureScores = {
      R: 0.73,
      F: 0.81,
      D: 0.42,
      L: 0.66,
      T: 0.55,
    };

    const result1 = computeConfidence(scores, DEFAULT_WEIGHTS);
    const result2 = computeConfidence(scores, DEFAULT_WEIGHTS);

    expect(result1).toBe(result2);
  });

  it("should handle very small fractional weights", () => {
    const tinyWeights = {
      R: 0.001,
      F: 0.001,
      D: 0.001,
      L: 0.001,
      T: 0.996,
    };

    const scores: AdaptiveFeatureScores = {
      R: 1.0,
      F: 1.0,
      D: 1.0,
      L: 1.0,
      T: 0.0, // Only heavily-weighted feature is zero
    };

    const result = computeConfidence(scores, tinyWeights);

    // Should be very low since temporal (0.996 weight) is 0
    expect(result).toBeLessThan(0.01);
  });

  it("should handle scores at boundary values", () => {
    const boundaryScores: AdaptiveFeatureScores = {
      R: 0,
      F: 1,
      D: 0,
      L: 1,
      T: 0,
    };

    const result = computeConfidence(boundaryScores, DEFAULT_WEIGHTS);

    // Expected: 0*0.22 + 1*0.24 + 0*0.18 + 1*0.18 + 0*0.18 = 0.42
    expect(result).toBeCloseTo(0.42, 5);
  });
});
