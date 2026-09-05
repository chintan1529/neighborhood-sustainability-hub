"""
NHS Research — Sensitivity Study (Risk 1)
==========================================
Sweeps key parameters across operationally meaningful ranges and measures
F1 score stability. Produces Table III for the paper.

Parameters swept:
  - n_zones:          24–384   (municipal ward count variance)
  - n_iterations:     5–50     (deployment cycle count)
  - tau:              0.40–0.70 (precision-recall tradeoff threshold)
  - alpha:            0.02–0.30 (learning rate)
  - noise_level:      0.02–0.12 (environmental stochasticity)
  - hotspot_density:  0.15–0.50 (event rate variance)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from experiments.engine_harness import EngineConfig, run_engine

DEFAULT_CONFIG = {
    "n_zones": 48,
    "n_iterations": 20,
    "tau": 0.58,
    "alpha": 0.10,
    "noise": 0.04,
    "hotspot_density": 0.56,  # Lower = more hotspots
}


def _terminal_metrics(results):
    """Extract final-cycle metrics from engine run."""
    if not results:
        return {"precision": 0, "recall": 0, "f1_score": 0}
    last5 = results[-5:] if len(results) >= 5 else results
    return {
        "precision": round(np.mean([r.precision for r in last5]), 4),
        "recall": round(np.mean([r.recall for r in last5]), 4),
        "f1_score": round(np.mean([r.f1_score for r in last5]), 4),
    }


def sweep_parameter(
    param_name: str,
    values: list,
    seeds: List[int],
    defaults: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Sweep one parameter while holding others at default."""
    rows = []
    for val in values:
        f1_scores = []
        precisions = []
        recalls = []

        for seed in seeds:
            cfg = EngineConfig(
                alpha=defaults["alpha"],
                prediction_threshold=defaults["tau"],
            )
            n_zones = defaults["n_zones"]
            n_iter = defaults["n_iterations"]
            noise = defaults["noise"]
            hs_thresh = defaults["hotspot_density"]

            if param_name == "n_zones":
                n_zones = val
            elif param_name == "n_iterations":
                n_iter = val
            elif param_name == "tau":
                cfg.prediction_threshold = val
            elif param_name == "alpha":
                cfg.alpha = val
            elif param_name == "noise":
                noise = val
            elif param_name == "hotspot_density":
                hs_thresh = 1.0 - val  # Invert: higher density = lower threshold

            results = run_engine(
                config=cfg,
                n_zones=n_zones,
                n_iterations=n_iter,
                noise_level=noise,
                hotspot_threshold=hs_thresh,
                seed=seed,
            )
            m = _terminal_metrics(results)
            f1_scores.append(m["f1_score"])
            precisions.append(m["precision"])
            recalls.append(m["recall"])

        rows.append({
            "parameter": param_name,
            "value": val,
            "f1_mean": round(np.mean(f1_scores), 4),
            "f1_std": round(np.std(f1_scores), 4),
            "precision_mean": round(np.mean(precisions), 4),
            "recall_mean": round(np.mean(recalls), 4),
            "n_seeds": len(seeds),
        })

    return rows


def run_sensitivity_study(config: dict) -> Dict[str, Any]:
    """Run full sensitivity study from config.yaml settings."""
    sens = config.get("sensitivity", {})
    seeds = sens.get("seeds", [42, 137, 256])

    defaults = DEFAULT_CONFIG.copy()
    eng = config.get("engine", {})
    defaults["alpha"] = eng.get("alpha", 0.10)
    defaults["tau"] = eng.get("prediction_threshold", 0.58)

    sweeps = {
        "n_zones": sens.get("n_zones", [24, 48, 96, 144, 192, 384]),
        "n_iterations": sens.get("n_iterations", [5, 10, 15, 20, 35, 50]),
        "tau": sens.get("tau", [0.40, 0.45, 0.50, 0.55, 0.60, 0.70]),
        "alpha": sens.get("alpha", [0.02, 0.05, 0.08, 0.10, 0.20, 0.30]),
        "noise": sens.get("noise", [0.02, 0.05, 0.08, 0.12]),
        "hotspot_density": sens.get("hotspot_density", [0.15, 0.25, 0.35, 0.50]),
    }

    all_results = {}
    total_runs = sum(len(v) * len(seeds) for v in sweeps.values())
    print(f"[Sensitivity] Running {total_runs} experiments across {len(sweeps)} parameters...")

    for param, values in sweeps.items():
        print(f"  Sweeping {param}: {values}")
        all_results[param] = sweep_parameter(param, values, seeds, defaults)

    return all_results


def format_table(results: Dict[str, List[Dict]]) -> str:
    """Format as markdown Table III."""
    lines = [
        "# Table III — Sensitivity Study",
        "",
        "F1 score (mean ± std) across parameter sweeps. Default: τ=0.58, α=0.10, 48 zones, 20 iterations.",
        "",
    ]

    for param, rows in results.items():
        lines.append(f"## {param}")
        lines.append("")
        lines.append(f"| {param} | F1 (mean) | F1 (std) | Precision | Recall |")
        lines.append("|---|---|---|---|---|")
        for r in rows:
            val = r["value"]
            lines.append(
                f"| {val} | {r['f1_mean']:.4f} | ±{r['f1_std']:.4f} | "
                f"{r['precision_mean']:.4f} | {r['recall_mean']:.4f} |"
            )
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    import yaml
    config_path = Path(__file__).resolve().parent.parent / "config.yaml"
    with open(config_path) as f:
        config = yaml.safe_load(f)

    results = run_sensitivity_study(config)
    table = format_table(results)
    print(table)

    out_dir = Path(__file__).resolve().parent.parent / "results" / "tables"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "table3_sensitivity.md").write_text(table, encoding="utf-8")

    metrics_dir = Path(__file__).resolve().parent.parent / "results"
    with open(metrics_dir / "sensitivity_raw.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n[Sensitivity] Saved to {out_dir / 'table3_sensitivity.md'}")
