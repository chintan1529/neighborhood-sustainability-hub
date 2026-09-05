"""
NHS Research — Hyperparameter Grid Search (Item #6)
=====================================================
Grid search over alpha × tau, producing F1 heatmap.
alpha ∈ {0.01, 0.05, 0.10, 0.20}
tau   ∈ {0.40, 0.50, 0.58, 0.70, 0.80, 0.90}
"""
from __future__ import annotations
import json, sys
from pathlib import Path
from typing import Any, Dict
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from experiments.engine_harness import EngineConfig, run_engine

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns
    HAS_VIZ = True
except ImportError:
    HAS_VIZ = False

def _terminal_f1(results, window=5):
    if not results: return 0.0
    last = results[-window:] if len(results) >= window else results
    return round(np.mean([r.f1_score for r in last]), 4)

def run_hyperparam_grid(config: dict) -> Dict[str, Any]:
    hg = config.get("hyperparameter_grid", {})
    alphas = hg.get("alpha_values", [0.01, 0.05, 0.10, 0.20])
    taus = hg.get("tau_values", [0.40, 0.50, 0.58, 0.70, 0.80, 0.90])
    n_zones = hg.get("n_zones", 48)
    n_iter = hg.get("n_iterations", 20)
    seeds = hg.get("seeds", [42, 137, 256, 512, 1024])

    grid = []
    total = len(alphas) * len(taus) * len(seeds)
    print(f"[Hyperparam] Grid: {len(alphas)} alphas × {len(taus)} taus × {len(seeds)} seeds = {total} runs")

    for a in alphas:
        for t in taus:
            f1s = []
            for seed in seeds:
                cfg = EngineConfig(alpha=a, prediction_threshold=t)
                r = run_engine(cfg, n_zones=n_zones, n_iterations=n_iter, seed=seed)
                f1s.append(_terminal_f1(r))
            grid.append({
                "alpha": a, "tau": t,
                "f1_mean": round(float(np.mean(f1s)), 4),
                "f1_std": round(float(np.std(f1s)), 4),
            })

    return {"alphas": alphas, "taus": taus, "grid": grid, "n_seeds": len(seeds)}

def format_table(results: Dict[str, Any]) -> str:
    lines = [
        "# Table — Hyperparameter Sensitivity (α × τ)", "",
        f"F1 scores (mean ± std, {results['n_seeds']} seeds) for each (α, τ) combination.", "",
        "| α \\ τ | " + " | ".join([f"{t}" for t in results["taus"]]) + " |",
        "|---" + "|---" * len(results["taus"]) + "|",
    ]
    grid = results["grid"]
    for a in results["alphas"]:
        row = f"| {a} |"
        for t in results["taus"]:
            entry = next((g for g in grid if g["alpha"] == a and g["tau"] == t), None)
            if entry:
                row += f" {entry['f1_mean']:.4f}±{entry['f1_std']:.4f} |"
            else:
                row += " — |"
        lines.append(row)
    return "\n".join(lines)

def plot_heatmap(results: Dict[str, Any], output_dir: Path) -> None:
    if not HAS_VIZ: return
    output_dir.mkdir(parents=True, exist_ok=True)

    alphas = results["alphas"]
    taus = results["taus"]
    grid = results["grid"]

    matrix = np.zeros((len(alphas), len(taus)))
    for g in grid:
        ai = alphas.index(g["alpha"])
        ti = taus.index(g["tau"])
        matrix[ai, ti] = g["f1_mean"]

    plt.figure(figsize=(10, 6))
    sns.heatmap(matrix, annot=True, fmt=".3f", cmap="YlGnBu",
                xticklabels=[str(t) for t in taus],
                yticklabels=[str(a) for a in alphas],
                cbar_kws={"label": "F1 Score"})
    plt.xlabel("Prediction Threshold (τ)", fontsize=12)
    plt.ylabel("Learning Rate (α)", fontsize=12)
    plt.title("Hyperparameter Sensitivity: F1 Score", fontsize=14, fontweight="bold")
    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig4_sensitivity_heatmap.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Sensitivity heatmap saved")

if __name__ == "__main__":
    import yaml
    config_path = Path(__file__).resolve().parent.parent / "config.yaml"
    with open(config_path) as f: config = yaml.safe_load(f)
    results = run_hyperparam_grid(config)
    print(format_table(results))
    plot_heatmap(results, Path(__file__).resolve().parent.parent / "results" / "figures")
