"""
NHS Research — Extended Prediction Cycles (Item #1)
=====================================================
Runs 20 prediction cycles with 5 independent seeds, tracking per-cycle:
  - Precision, Recall, F1
  - Weight evolution (5 weights × 20 cycles)

Outputs:
  - Table: cycle vs metrics (mean ± std)
  - Figure: convergence curve with confidence bands
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from experiments.engine_harness import EngineConfig, run_engine, FEATURE_NAMES

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False


def run_extended_cycles(config: dict) -> Dict[str, Any]:
    """Run extended prediction cycles with multiple seeds."""
    ext = config.get("extended_cycles", {})
    n_zones = ext.get("n_zones", 48)
    n_iter = ext.get("n_iterations", 20)
    seeds = ext.get("seeds", [42, 137, 256, 512, 1024])
    eng = config.get("engine", {})

    # Collect per-cycle metrics across seeds
    all_precisions = []  # (n_seeds, n_iter)
    all_recalls = []
    all_f1s = []
    all_weights = []  # (n_seeds, n_iter, 5)

    for seed in seeds:
        cfg = EngineConfig.from_dict(eng)
        results = run_engine(cfg, n_zones=n_zones, n_iterations=n_iter, seed=seed)

        all_precisions.append([r.precision for r in results])
        all_recalls.append([r.recall for r in results])
        all_f1s.append([r.f1_score for r in results])
        all_weights.append([r.weights.tolist() for r in results])

    all_precisions = np.array(all_precisions)  # (5, 20)
    all_recalls = np.array(all_recalls)
    all_f1s = np.array(all_f1s)
    all_weights = np.array(all_weights)  # (5, 20, 5)

    # Compute per-cycle stats
    cycle_results = []
    for c in range(n_iter):
        cycle_results.append({
            "cycle": c + 1,
            "precision_mean": round(float(all_precisions[:, c].mean()), 4),
            "precision_std": round(float(all_precisions[:, c].std()), 4),
            "recall_mean": round(float(all_recalls[:, c].mean()), 4),
            "recall_std": round(float(all_recalls[:, c].std()), 4),
            "f1_mean": round(float(all_f1s[:, c].mean()), 4),
            "f1_std": round(float(all_f1s[:, c].std()), 4),
            "weights_mean": [round(float(x), 4) for x in all_weights[:, c, :].mean(axis=0)],
            "weights_std": [round(float(x), 4) for x in all_weights[:, c, :].std(axis=0)],
        })

    return {
        "n_seeds": len(seeds),
        "n_zones": n_zones,
        "n_iterations": n_iter,
        "cycles": cycle_results,
        "final_f1_mean": cycle_results[-1]["f1_mean"],
        "final_f1_std": cycle_results[-1]["f1_std"],
    }


def format_table(results: Dict[str, Any]) -> str:
    """Format as markdown table — cycle vs metrics."""
    lines = [
        "# Table — Extended Prediction Cycles",
        "",
        f"NHS Adaptive Engine evaluated over {results['n_iterations']} prediction cycles "
        f"({results['n_zones']} zones, {results['n_seeds']} seeds, mean ± std).",
        "",
        "| Cycle | Precision | Recall | F1 | w_R | w_F | w_D | w_L | w_T |",
        "|---|---|---|---|---|---|---|---|---|",
    ]

    for c in results["cycles"]:
        w = c["weights_mean"]
        lines.append(
            f"| {c['cycle']} | {c['precision_mean']:.4f}±{c['precision_std']:.4f} | "
            f"{c['recall_mean']:.4f}±{c['recall_std']:.4f} | "
            f"{c['f1_mean']:.4f}±{c['f1_std']:.4f} | "
            f"{w[0]:.3f} | {w[1]:.3f} | {w[2]:.3f} | {w[3]:.3f} | {w[4]:.3f} |"
        )

    lines.append("")
    lines.append(f"**Converged F1**: {results['final_f1_mean']:.4f} ± {results['final_f1_std']:.4f}")
    return "\n".join(lines)


def plot_extended_cycles(results: Dict[str, Any], output_dir: Path) -> None:
    """Generate convergence curve with confidence bands + weight evolution."""
    if not HAS_MPL:
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    cycles = results["cycles"]
    iters = [c["cycle"] for c in cycles]

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    # --- Panel 1: Precision/Recall/F1 convergence ---
    for metric, color, label in [
        ("f1", "#2563eb", "F1"),
        ("precision", "#10b981", "Precision"),
        ("recall", "#f59e0b", "Recall"),
    ]:
        means = [c[f"{metric}_mean"] for c in cycles]
        stds = [c[f"{metric}_std"] for c in cycles]
        means_arr = np.array(means)
        stds_arr = np.array(stds)

        axes[0].plot(iters, means, "o-", color=color, linewidth=2, markersize=4, label=label)
        axes[0].fill_between(iters, means_arr - stds_arr, means_arr + stds_arr,
                             alpha=0.15, color=color)

    axes[0].set_xlabel("Prediction Cycle", fontsize=12)
    axes[0].set_ylabel("Score", fontsize=12)
    axes[0].set_title("Metric Convergence (mean ± std)", fontsize=13, fontweight="bold")
    axes[0].legend(fontsize=10)
    axes[0].grid(alpha=0.3)
    axes[0].set_ylim(0, 1.05)

    # --- Panel 2: Weight evolution ---
    colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"]
    for i, name in enumerate(FEATURE_NAMES):
        w_means = [c["weights_mean"][i] for c in cycles]
        w_stds = [c["weights_std"][i] for c in cycles]
        w_arr = np.array(w_means)
        ws_arr = np.array(w_stds)
        axes[1].plot(iters, w_means, "o-", color=colors[i], linewidth=2, markersize=4, label=name)
        axes[1].fill_between(iters, w_arr - ws_arr, w_arr + ws_arr, alpha=0.12, color=colors[i])

    axes[1].set_xlabel("Prediction Cycle", fontsize=12)
    axes[1].set_ylabel("Normalized Weight", fontsize=12)
    axes[1].set_title("Weight Evolution (mean ± std)", fontsize=13, fontweight="bold")
    axes[1].legend(fontsize=10)
    axes[1].grid(alpha=0.3)

    # --- Panel 3: F1 convergence rate ---
    f1_means = np.array([c["f1_mean"] for c in cycles])
    f1_delta = np.diff(f1_means)
    axes[2].bar(iters[1:], f1_delta, color=["#10b981" if d >= 0 else "#ef4444" for d in f1_delta],
                alpha=0.8, edgecolor="white", linewidth=0.5)
    axes[2].axhline(y=0, color="black", linewidth=0.5)
    axes[2].set_xlabel("Prediction Cycle", fontsize=12)
    axes[2].set_ylabel("ΔF1 (cycle-over-cycle)", fontsize=12)
    axes[2].set_title("F1 Convergence Rate", fontsize=13, fontweight="bold")
    axes[2].grid(alpha=0.3, axis="y")

    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig_extended_cycles.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Extended cycles figure saved")


if __name__ == "__main__":
    import yaml
    config_path = Path(__file__).resolve().parent.parent / "config.yaml"
    with open(config_path) as f:
        config = yaml.safe_load(f)

    results = run_extended_cycles(config)
    print(format_table(results))

    out_dir = Path(__file__).resolve().parent.parent / "results"
    ext_dir = out_dir / "extended_cycles"
    ext_dir.mkdir(parents=True, exist_ok=True)
    (ext_dir / "table_extended_cycles.md").write_text(format_table(results), encoding="utf-8")
    plot_extended_cycles(results, out_dir / "figures")

    with open(ext_dir / "extended_cycles_raw.json", "w") as f:
        json.dump(results, f, indent=2)
