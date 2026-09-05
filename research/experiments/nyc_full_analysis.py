"""
NHS Research — NYC 311 Full Cycle Analysis (Item #2)
======================================================
Runs the full adaptive prediction loop on real NYC 311 data:
  - Multi-cycle prediction with weight updates
  - Per-cycle F1, Precision, Recall tracking
  - Weight evolution on real data

Outputs:
  - Table: NYC cycle-by-cycle results
  - Figure: NYC convergence curve
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from experiments.engine_harness import (
    EngineConfig, compute_confidence, compute_metrics,
    normalize_weights, update_weights, N_FEATURES, FEATURE_NAMES,
)

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False


def run_nyc_full_cycles(
    features: np.ndarray,
    labels: np.ndarray,
    config: dict,
) -> Dict[str, Any]:
    """
    Run full adaptive prediction on real NYC data.

    Args:
        features: (n_cycles, n_zones, 5)
        labels: (n_cycles, n_zones) bool
        config: engine config dict
    """
    eng = config.get("engine", {})
    weights = normalize_weights(
        np.array(eng.get("initial_weights", [0.22, 0.24, 0.18, 0.18, 0.18]))
    )
    tau = eng.get("prediction_threshold", 0.58)
    alpha = eng.get("alpha", 0.10)
    target_prec = eng.get("target_precision", 0.75)
    decay = eng.get("decay_rate", 0.05)

    n_cycles = features.shape[0]
    cycle_results = []

    for c in range(n_cycles - 1):  # Last cycle used for labeling
        confs = compute_confidence(features[c], weights)
        pred = confs >= tau
        if not np.any(pred):
            pred[np.argmax(confs)] = True

        m = compute_metrics(pred, labels[c])

        # Weight update
        v_feats = features[c][pred & labels[c]]
        m_feats = features[c][pred & ~labels[c]]
        a_feats = features[c][labels[c]]

        effective_alpha = alpha / (1 + decay * c)
        new_weights, contribution, error = update_weights(
            weights, m["precision"], target_prec,
            v_feats, m_feats, a_feats, effective_alpha,
        )

        cycle_results.append({
            "cycle": c + 1,
            "precision": m["precision"],
            "recall": m["recall"],
            "f1_score": m["f1_score"],
            "verified": m["verified"],
            "missed": m["missed"],
            "actual_hotspots": m["actual_hotspots"],
            "weights": weights.tolist(),
            "performance_error": error,
        })

        weights = new_weights

    return {
        "n_cycles": len(cycle_results),
        "cycles": cycle_results,
        "final_f1": cycle_results[-1]["f1_score"] if cycle_results else 0,
        "final_weights": weights.tolist(),
        "mean_f1": round(float(np.mean([c["f1_score"] for c in cycle_results])), 4),
        "std_f1": round(float(np.std([c["f1_score"] for c in cycle_results])), 4),
    }


def format_table(results: Dict[str, Any]) -> str:
    """Format NYC cycle results as markdown table."""
    lines = [
        "# Table — NYC 311 Full Cycle Results",
        "",
        f"NHS Adaptive Engine on real NYC 311 complaint data ({results['n_cycles']} cycles).",
        f"Mean F1: {results['mean_f1']:.4f} ± {results['std_f1']:.4f}",
        "",
        "| Cycle | Precision | Recall | F1 | Verified | Missed | Hotspots | w_R | w_F | w_D | w_L | w_T |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]

    for c in results["cycles"]:
        w = c["weights"]
        lines.append(
            f"| {c['cycle']} | {c['precision']:.4f} | {c['recall']:.4f} | "
            f"{c['f1_score']:.4f} | {c['verified']} | {c['missed']} | "
            f"{c['actual_hotspots']} | {w[0]:.3f} | {w[1]:.3f} | "
            f"{w[2]:.3f} | {w[3]:.3f} | {w[4]:.3f} |"
        )

    return "\n".join(lines)


def plot_nyc_convergence(results: Dict[str, Any], output_dir: Path) -> None:
    """Generate NYC convergence figure."""
    if not HAS_MPL:
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    cycles = results["cycles"]
    iters = [c["cycle"] for c in cycles]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Metrics convergence
    ax1.plot(iters, [c["f1_score"] for c in cycles], "o-", color="#2563eb",
             linewidth=2, markersize=5, label="F1")
    ax1.plot(iters, [c["precision"] for c in cycles], "s--", color="#10b981",
             linewidth=1.5, markersize=4, label="Precision")
    ax1.plot(iters, [c["recall"] for c in cycles], "^--", color="#f59e0b",
             linewidth=1.5, markersize=4, label="Recall")
    ax1.set_xlabel("Prediction Cycle", fontsize=12)
    ax1.set_ylabel("Score", fontsize=12)
    ax1.set_title("NYC 311 — Metric Convergence", fontsize=14, fontweight="bold")
    ax1.legend(fontsize=10)
    ax1.grid(alpha=0.3)
    ax1.set_ylim(0, 1.05)

    # Weight evolution
    colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"]
    for i, name in enumerate(FEATURE_NAMES):
        weights = [c["weights"][i] for c in cycles]
        ax2.plot(iters, weights, "o-", color=colors[i], linewidth=2, markersize=4, label=name)

    ax2.set_xlabel("Prediction Cycle", fontsize=12)
    ax2.set_ylabel("Normalized Weight", fontsize=12)
    ax2.set_title("NYC 311 — Weight Evolution", fontsize=14, fontweight="bold")
    ax2.legend(fontsize=10)
    ax2.grid(alpha=0.3)

    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig6_nyc_convergence.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ NYC convergence figure saved")


if __name__ == "__main__":
    import yaml
    config_path = Path(__file__).resolve().parent.parent / "config.yaml"
    with open(config_path) as f:
        config = yaml.safe_load(f)

    # Load pre-existing NYC data
    raw_path = Path(__file__).resolve().parent.parent / "data" / "nyc311" / "nyc311_raw.json"
    if raw_path.exists():
        with open(raw_path) as f:
            raw = json.load(f)

        from data.nyc311.transform import transform_records, build_zone_features
        records = transform_records(raw)
        features, labels, zone_ids = build_zone_features(records, n_cycles=10)

        if features.size > 0:
            results = run_nyc_full_cycles(features, labels, config)
            print(format_table(results))

            out_dir = Path(__file__).resolve().parent.parent / "results"
            (out_dir / "tables" / "table_nyc_cycles.md").write_text(
                format_table(results), encoding="utf-8"
            )
            plot_nyc_convergence(results, out_dir / "figures")
    else:
        print("[NYC] Raw data not found. Run fetch_data.py first.")
