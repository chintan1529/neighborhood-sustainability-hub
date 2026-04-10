from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

try:
    import pandas as pd
except Exception:  # pragma: no cover - optional dependency
    pd = None

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover - optional dependency
    plt = None


FEATURE_NAMES = ["R", "F", "D", "L", "T"]


@dataclass
class SimulationConfig:
    n_zones: int = 30
    n_iterations: int = 15
    alpha: float = 0.1
    target_precision: float = 0.75
    prediction_threshold: float = 0.58
    actual_threshold: float = 0.56
    random_seed: int = 42


def compute_confidence(feature_matrix: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Compute zone confidence scores from normalized weights."""
    return feature_matrix @ weights


def normalize_weights(weights: np.ndarray) -> np.ndarray:
    clipped = np.clip(weights, 1e-6, None)
    return clipped / clipped.sum()


def compute_metrics(predicted_mask: np.ndarray, actual_mask: np.ndarray) -> Dict[str, float]:
    verified = int(np.sum(predicted_mask & actual_mask))
    missed = int(np.sum(predicted_mask & ~actual_mask))
    actual_hotspots = int(np.sum(actual_mask))

    precision = verified / max(1, verified + missed)
    recall = verified / max(1, actual_hotspots)
    f1_score = 0.0 if precision + recall == 0 else (2 * precision * recall) / (precision + recall)

    return {
        "verified": verified,
        "missed": missed,
        "actual_hotspots": actual_hotspots,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
    }


def update_weights(
    weights: np.ndarray,
    current_precision: float,
    target_precision: float,
    verified_features: np.ndarray,
    missed_features: np.ndarray,
    actual_hotspot_features: np.ndarray,
    alpha: float = 0.1,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Update weights using feedback-driven feature contributions.

    Corrective phase:
        wi_new = wi + alpha * (target_precision - current_precision) * contribution_i

    Stabilized reinforcement phase:
        if precision is already above target, continue reinforcing features associated
        with verified hotspots using a smaller positive step instead of reversing them.
    """
    if verified_features.size == 0:
        verified_mean = np.zeros_like(weights)
    else:
        verified_mean = verified_features.mean(axis=0)

    if missed_features.size == 0:
        missed_mean = np.zeros_like(weights)
    else:
        missed_mean = missed_features.mean(axis=0)

    if actual_hotspot_features.size == 0:
        hotspot_mean = verified_mean
    else:
        hotspot_mean = actual_hotspot_features.mean(axis=0)

    contribution = (0.65 * verified_mean + 0.35 * hotspot_mean) - missed_mean

    performance_error = target_precision - current_precision
    if performance_error >= 0:
        step_size = alpha * performance_error
        delta = step_size * contribution
    else:
        # When precision is already above target, reinforce successful directions with a smaller step.
        step_size = alpha * abs(performance_error) * 0.4
        delta = step_size * np.maximum(contribution, 0.0)

    updated = normalize_weights(weights + delta)
    return updated, contribution, performance_error


def create_sample_zone_profiles(n_zones: int, rng: np.random.Generator) -> Tuple[np.ndarray, np.ndarray]:
    base_profiles = rng.uniform(0.15, 0.85, size=(n_zones, len(FEATURE_NAMES)))
    zone_bias = rng.normal(loc=0.0, scale=0.06, size=n_zones)
    return base_profiles, zone_bias


def build_cycle_features(
    base_profiles: np.ndarray,
    recent_history: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    last_cycle = recent_history[-1] if recent_history.shape[0] > 0 else np.zeros(base_profiles.shape[0])
    short_window = recent_history[-3:].mean(axis=0) if recent_history.shape[0] > 0 else np.zeros(base_profiles.shape[0])
    medium_window = recent_history[-6:].mean(axis=0) if recent_history.shape[0] > 0 else np.zeros(base_profiles.shape[0])

    features = np.zeros_like(base_profiles)
    noise = rng.normal(0.0, 0.04, size=base_profiles.shape)

    features[:, 0] = 0.55 * last_cycle + 0.25 * short_window + 0.20 * base_profiles[:, 0]  # R
    features[:, 1] = 0.60 * short_window + 0.20 * medium_window + 0.20 * base_profiles[:, 1]  # F
    features[:, 2] = 0.75 * base_profiles[:, 2] + 0.25 * short_window  # D
    features[:, 3] = 0.85 * base_profiles[:, 3] + 0.15 * medium_window  # L
    features[:, 4] = 0.50 * base_profiles[:, 4] + 0.25 * short_window + 0.25 * last_cycle  # T

    return np.clip(features + noise, 0.0, 1.0)


def simulate_actual_hotspots(
    feature_matrix: np.ndarray,
    true_weights: np.ndarray,
    zone_bias: np.ndarray,
    threshold: float,
    rng: np.random.Generator,
) -> np.ndarray:
    logits = (compute_confidence(feature_matrix, true_weights) + zone_bias - threshold) * 4.0
    probabilities = 1.0 / (1.0 + np.exp(-logits))
    return rng.binomial(1, probabilities).astype(bool)


def prediction_to_feedback_rows(
    iteration: int,
    feature_matrix: np.ndarray,
    confidences: np.ndarray,
    predicted_mask: np.ndarray,
    actual_mask: np.ndarray,
) -> List[Dict[str, float]]:
    rows: List[Dict[str, float]] = []
    for zone_index in np.where(predicted_mask)[0]:
        rows.append(
            {
                "iteration": iteration,
                "zone_id": zone_index,
                "confidence": float(confidences[zone_index]),
                "status": "VERIFIED" if actual_mask[zone_index] else "MISSED",
                "R": float(feature_matrix[zone_index, 0]),
                "F": float(feature_matrix[zone_index, 1]),
                "D": float(feature_matrix[zone_index, 2]),
                "L": float(feature_matrix[zone_index, 3]),
                "T": float(feature_matrix[zone_index, 4]),
            }
        )
    return rows


def build_history_table(rows: List[Dict[str, float]]):
    if pd is None:
        return rows
    return pd.DataFrame(rows)


def plot_history(history_table, output_dir: Path) -> None:
    if plt is None or pd is None:
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(8, 4))
    plt.plot(history_table["iteration"], history_table["precision"], marker="o", linewidth=2)
    plt.title("Precision vs Iteration")
    plt.xlabel("Iteration")
    plt.ylabel("Precision")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_dir / "precision_vs_iteration.png", dpi=150)
    plt.close()

    plt.figure(figsize=(9, 5))
    for feature in FEATURE_NAMES:
        plt.plot(history_table["iteration"], history_table[f"w_{feature}"], marker="o", linewidth=1.8, label=feature)
    plt.title("Adaptive Weight Evolution")
    plt.xlabel("Iteration")
    plt.ylabel("Normalized Weight")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_dir / "weight_evolution.png", dpi=150)
    plt.close()


def run_simulation(
    n_iterations: int = 15,
    n_zones: int = 30,
    alpha: float = 0.1,
    target_precision: float = 0.75,
    prediction_threshold: float = 0.58,
    actual_threshold: float = 0.56,
    random_seed: int = 42,
    plot: bool = True,
):
    rng = np.random.default_rng(random_seed)
    base_profiles, zone_bias = create_sample_zone_profiles(n_zones, rng)

    current_weights = normalize_weights(np.array([0.25, 0.25, 0.18, 0.16, 0.16], dtype=float))
    true_weights = normalize_weights(np.array([0.28, 0.24, 0.17, 0.16, 0.15], dtype=float))

    actual_history = np.zeros((0, n_zones), dtype=float)
    weight_rows: List[Dict[str, float]] = []
    prediction_rows: List[Dict[str, float]] = []

    for iteration in range(1, n_iterations + 1):
        feature_matrix = build_cycle_features(base_profiles, actual_history, rng)
        actual_mask = simulate_actual_hotspots(feature_matrix, true_weights, zone_bias, actual_threshold, rng)
        actual_history = np.vstack([actual_history, actual_mask.astype(float)])

        confidences = compute_confidence(feature_matrix, current_weights)
        predicted_mask = confidences >= prediction_threshold

        # Keep simulation informative even when threshold is briefly too strict.
        if np.sum(predicted_mask) == 0:
            top_zone = int(np.argmax(confidences))
            predicted_mask[top_zone] = True

        metrics = compute_metrics(predicted_mask, actual_mask)
        verified_features = feature_matrix[predicted_mask & actual_mask]
        missed_features = feature_matrix[predicted_mask & ~actual_mask]
        actual_hotspot_features = feature_matrix[actual_mask]

        next_weights, contribution, performance_error = update_weights(
            current_weights,
            current_precision=metrics["precision"],
            target_precision=target_precision,
            verified_features=verified_features,
            missed_features=missed_features,
            actual_hotspot_features=actual_hotspot_features,
            alpha=alpha,
        )

        prediction_rows.extend(
            prediction_to_feedback_rows(
                iteration=iteration,
                feature_matrix=feature_matrix,
                confidences=confidences,
                predicted_mask=predicted_mask,
                actual_mask=actual_mask,
            )
        )

        weight_rows.append(
            {
                "iteration": iteration,
                "precision": round(metrics["precision"], 4),
                "recall": round(metrics["recall"], 4),
                "f1_score": round(metrics["f1_score"], 4),
                "verified": metrics["verified"],
                "missed": metrics["missed"],
                "actual_hotspots": metrics["actual_hotspots"],
                "performance_error": round(performance_error, 4),
                **{f"w_{name}": round(value, 4) for name, value in zip(FEATURE_NAMES, current_weights)},
                **{f"c_{name}": round(value, 4) for name, value in zip(FEATURE_NAMES, contribution)},
            }
        )

        current_weights = next_weights

    history_table = build_history_table(weight_rows)
    prediction_table = build_history_table(prediction_rows)

    if plot:
        plot_history(history_table, Path(__file__).resolve().parent / "output")

    return {
        "weights_history": history_table,
        "prediction_feedback": prediction_table,
    }


def print_summary(results) -> None:
    weights_history = results["weights_history"]
    if pd is not None and isinstance(weights_history, pd.DataFrame):
        columns = [
            "iteration",
            "precision",
            "recall",
            "f1_score",
            "verified",
            "missed",
            "w_R",
            "w_F",
            "w_D",
            "w_L",
            "w_T",
        ]
        print("\nWeight table per iteration\n")
        print(weights_history[columns].to_string(index=False))

        improvement = weights_history[["iteration", "precision"]]
        print("\nPrecision improvement over time\n")
        print(improvement.to_string(index=False))
    else:
        print(weights_history)


if __name__ == "__main__":
    results = run_simulation(
        n_iterations=15,
        n_zones=30,
        alpha=0.1,
        target_precision=0.75,
        prediction_threshold=0.58,
        actual_threshold=0.56,
        random_seed=42,
        plot=True,
    )
    print_summary(results)
