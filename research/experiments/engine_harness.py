"""
NHS Research — Core Engine Harness
===================================
Pure-Python port of the NHS predictive hotspot engine.
Faithfully reproduces the exact math from:
  - src/lib/predictive-engine.ts (buildClusters, buildDeterministicPredictions)
  - src/lib/adaptive-weight-optimizer.ts (computeConfidence, updateWeights)

This enables running thousands of experiment configurations without a database,
with deterministic reproducibility via fixed random seeds.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

FEATURE_NAMES = ["R", "F", "D", "L", "T"]
N_FEATURES = len(FEATURE_NAMES)


@dataclass
class EngineConfig:
    """Mirrors production engine constants."""
    initial_weights: np.ndarray = field(
        default_factory=lambda: np.array([0.22, 0.24, 0.18, 0.18, 0.18])
    )
    alpha: float = 0.10
    target_precision: float = 0.75
    prediction_threshold: float = 0.58
    convergence_delta: float = 0.02
    convergence_after: int = 5
    decay_rate: float = 0.05

    @staticmethod
    def from_dict(d: dict) -> "EngineConfig":
        cfg = EngineConfig()
        if "initial_weights" in d:
            cfg.initial_weights = np.array(d["initial_weights"], dtype=float)
        for key in ["alpha", "target_precision", "prediction_threshold",
                     "convergence_delta", "convergence_after", "decay_rate"]:
            if key in d:
                setattr(cfg, key, d[key])
        return cfg


@dataclass
class CycleMetrics:
    """Result of one prediction-feedback cycle."""
    iteration: int
    precision: float
    recall: float
    f1_score: float
    verified: int
    missed: int
    actual_hotspots: int
    weights: np.ndarray
    contribution: np.ndarray
    performance_error: float
    feature_scores: np.ndarray  # (n_zones, 5)
    predicted_mask: np.ndarray
    actual_mask: np.ndarray


def normalize_weights(weights: np.ndarray) -> np.ndarray:
    """L1 normalization with floor clipping — mirrors adaptive-weight-optimizer.ts."""
    clipped = np.clip(weights, 1e-6, None)
    return clipped / clipped.sum()


def compute_confidence(features: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Weighted linear combination — mirrors computeConfidence()."""
    return features @ weights


def compute_metrics(predicted: np.ndarray, actual: np.ndarray) -> Dict[str, float]:
    """Precision, recall, F1 — mirrors computeMetrics()."""
    verified = int(np.sum(predicted & actual))
    missed = int(np.sum(predicted & ~actual))
    actual_hotspots = int(np.sum(actual))

    precision = verified / max(1, verified + missed)
    recall = verified / max(1, actual_hotspots)
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "verified": verified,
        "missed": missed,
        "actual_hotspots": actual_hotspots,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
    }


def update_weights(
    current: np.ndarray,
    precision: float,
    target: float,
    verified_features: np.ndarray,
    missed_features: np.ndarray,
    actual_features: np.ndarray,
    alpha: float,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Error-proportional gradient step — mirrors updateWeights() in adaptive-weight-optimizer.ts.

    Corrective phase:   w_new = w + alpha * error * contribution
    Stabilized phase:   w_new = w + alpha * |error| * 0.4 * max(contribution, 0)
    """
    v_mean = verified_features.mean(axis=0) if verified_features.size > 0 else np.zeros(N_FEATURES)
    m_mean = missed_features.mean(axis=0) if missed_features.size > 0 else np.zeros(N_FEATURES)
    a_mean = actual_features.mean(axis=0) if actual_features.size > 0 else v_mean.copy()

    contribution = 0.65 * v_mean + 0.35 * a_mean - m_mean
    error = target - precision

    if error >= 0:
        step = alpha * error
        delta = step * contribution
    else:
        step = alpha * abs(error) * 0.4
        delta = step * np.maximum(contribution, 0.0)

    updated = normalize_weights(current + delta)
    return updated, contribution, round(error, 4)


def create_zone_profiles(n_zones: int, rng: np.random.Generator) -> Tuple[np.ndarray, np.ndarray]:
    """Generate base feature profiles and zone-specific bias."""
    profiles = rng.uniform(0.15, 0.85, size=(n_zones, N_FEATURES))
    bias = rng.normal(0.0, 0.06, size=n_zones)
    return profiles, bias


def build_cycle_features(
    profiles: np.ndarray,
    history: np.ndarray,
    rng: np.random.Generator,
    noise_level: float = 0.04,
) -> np.ndarray:
    """
    Generate features for one cycle using history and base profiles.
    Mirrors the temporal dependency logic of the production engine.
    """
    n_zones = profiles.shape[0]
    last = history[-1] if history.shape[0] > 0 else np.zeros(n_zones)
    short = history[-3:].mean(axis=0) if history.shape[0] > 0 else np.zeros(n_zones)
    medium = history[-6:].mean(axis=0) if history.shape[0] > 0 else np.zeros(n_zones)

    features = np.zeros_like(profiles)
    noise = rng.normal(0.0, noise_level, size=profiles.shape)

    features[:, 0] = 0.55 * last + 0.25 * short + 0.20 * profiles[:, 0]       # R (Recency)
    features[:, 1] = 0.60 * short + 0.20 * medium + 0.20 * profiles[:, 1]      # F (Frequency)
    features[:, 2] = 0.75 * profiles[:, 2] + 0.25 * short                       # D (Dominance)
    features[:, 3] = 0.85 * profiles[:, 3] + 0.15 * medium                      # L (Location)
    features[:, 4] = 0.50 * profiles[:, 4] + 0.25 * short + 0.25 * last        # T (Temporal)

    return np.clip(features + noise, 0.0, 1.0)


def simulate_ground_truth(
    features: np.ndarray,
    true_weights: np.ndarray,
    bias: np.ndarray,
    threshold: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Simulate actual hotspot occurrence via sigmoid probability model."""
    logits = (compute_confidence(features, true_weights) + bias - threshold) * 4.0
    probs = 1.0 / (1.0 + np.exp(-logits))
    return rng.binomial(1, probs).astype(bool)


def run_engine(
    config: EngineConfig,
    n_zones: int = 48,
    n_iterations: int = 20,
    noise_level: float = 0.04,
    hotspot_threshold: float = 0.56,
    seed: int = 42,
    disabled_features: Optional[List[int]] = None,
) -> List[CycleMetrics]:
    """
    Run the full NHS adaptive prediction engine for n_iterations cycles.

    Args:
        config: Engine configuration
        n_zones: Number of geohash zones
        n_iterations: Number of prediction-feedback cycles
        noise_level: Environmental noise standard deviation
        hotspot_threshold: Ground truth hotspot threshold
        seed: Random seed for reproducibility
        disabled_features: Indices of features to zero-out (for ablation)

    Returns:
        List of CycleMetrics, one per iteration
    """
    rng = np.random.default_rng(seed)
    profiles, bias = create_zone_profiles(n_zones, rng)
    true_weights = normalize_weights(np.array([0.28, 0.24, 0.17, 0.16, 0.15]))

    weights = normalize_weights(config.initial_weights.copy())
    history = np.zeros((0, n_zones), dtype=float)
    results: List[CycleMetrics] = []

    for iteration in range(1, n_iterations + 1):
        features = build_cycle_features(profiles, history, rng, noise_level)

        # Ablation: zero-out disabled features
        if disabled_features:
            for idx in disabled_features:
                features[:, idx] = 0.0

        actual = simulate_ground_truth(features, true_weights, bias, hotspot_threshold, rng)
        history = np.vstack([history, actual.astype(float)])

        confidences = compute_confidence(features, weights)
        predicted = confidences >= config.prediction_threshold

        # Ensure at least one prediction per cycle
        if not np.any(predicted):
            predicted[np.argmax(confidences)] = True

        metrics = compute_metrics(predicted, actual)

        v_feats = features[predicted & actual]
        m_feats = features[predicted & ~actual]
        a_feats = features[actual]

        # Learning rate decay (mirrors production code)
        effective_alpha = config.alpha / (1 + config.decay_rate * (iteration - 1))

        # Convergence gating (mirrors production code)
        delta = abs(metrics["precision"] - config.target_precision)
        if iteration >= config.convergence_after and delta < config.convergence_delta:
            contribution = np.zeros(N_FEATURES)
            error = round(config.target_precision - metrics["precision"], 4)
        else:
            weights, contribution, error = update_weights(
                weights, metrics["precision"], config.target_precision,
                v_feats, m_feats, a_feats, effective_alpha,
            )

        results.append(CycleMetrics(
            iteration=iteration,
            precision=metrics["precision"],
            recall=metrics["recall"],
            f1_score=metrics["f1_score"],
            verified=metrics["verified"],
            missed=metrics["missed"],
            actual_hotspots=metrics["actual_hotspots"],
            weights=weights.copy(),
            contribution=contribution.copy(),
            performance_error=error,
            feature_scores=features.copy(),
            predicted_mask=predicted.copy(),
            actual_mask=actual.copy(),
        ))

    return results


def run_static_baseline(
    n_zones: int = 48,
    n_iterations: int = 20,
    threshold: float = 0.58,
    hotspot_threshold: float = 0.56,
    noise_level: float = 0.04,
    seed: int = 42,
) -> List[CycleMetrics]:
    """Run with fixed equal weights (no adaptation) as baseline."""
    config = EngineConfig(
        initial_weights=np.array([0.20, 0.20, 0.20, 0.20, 0.20]),
        alpha=0.0,  # No updates
        target_precision=0.75,
        prediction_threshold=threshold,
    )
    # Override update_weights by using alpha=0
    rng = np.random.default_rng(seed)
    profiles, bias = create_zone_profiles(n_zones, rng)
    true_weights = normalize_weights(np.array([0.28, 0.24, 0.17, 0.16, 0.15]))

    static_w = normalize_weights(config.initial_weights.copy())
    history = np.zeros((0, n_zones), dtype=float)
    results: List[CycleMetrics] = []

    for iteration in range(1, n_iterations + 1):
        features = build_cycle_features(profiles, history, rng, noise_level)
        actual = simulate_ground_truth(features, true_weights, bias, hotspot_threshold, rng)
        history = np.vstack([history, actual.astype(float)])

        confidences = compute_confidence(features, static_w)
        predicted = confidences >= config.prediction_threshold
        if not np.any(predicted):
            predicted[np.argmax(confidences)] = True

        metrics = compute_metrics(predicted, actual)

        results.append(CycleMetrics(
            iteration=iteration,
            precision=metrics["precision"],
            recall=metrics["recall"],
            f1_score=metrics["f1_score"],
            verified=metrics["verified"],
            missed=metrics["missed"],
            actual_hotspots=metrics["actual_hotspots"],
            weights=static_w.copy(),
            contribution=np.zeros(N_FEATURES),
            performance_error=0.0,
            feature_scores=features.copy(),
            predicted_mask=predicted.copy(),
            actual_mask=actual.copy(),
        ))

    return results
