#!/usr/bin/env python3
"""
NHS Research — Master Experiment Runner (v2.0)
===============================================
One-command reproduction of ALL research results.

Usage:
    python research/run_all.py              # Run all experiments
    python research/run_all.py --quick      # Quick mode (reduced configs)
    python research/run_all.py --skip-nyc   # Skip NYC 311 fetch
    python research/run_all.py --skip-chicago  # Skip Chicago 311 fetch

Outputs:
    research/results/tables/     — Publication-ready tables
    research/results/figures/    — Publication-ready figures (PNG + PDF)
    research/results/metrics.json — All raw metrics
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

RESEARCH_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(RESEARCH_ROOT))

import numpy as np

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False


def load_config() -> dict:
    config_path = RESEARCH_ROOT / "config.yaml"
    if HAS_YAML and config_path.exists():
        with open(config_path) as f:
            return yaml.safe_load(f)
    return {
        "random_seed": 42,
        "engine": {
            "initial_weights": [0.22, 0.24, 0.18, 0.18, 0.18],
            "alpha": 0.10, "target_precision": 0.75,
            "prediction_threshold": 0.58,
        },
        "sensitivity": {"seeds": [42, 137, 256, 512, 1024]},
        "scalability": {"zone_counts": [48, 96, 192, 384], "iterations": 20, "repetitions": 5},
        "baselines": {"n_zones": 48, "n_cycles": 30, "seeds": [42, 137, 256, 512, 1024]},
    }


def generate_table1() -> str:
    """Table I — Feature Definitions."""
    return """# Table I — Feature Definitions

The NHS adaptive hotspot engine uses 5 interpretable features computed per geohash zone.

| Symbol | Feature | Definition | Range | Operational Meaning |
|---|---|---|---|---|
| R | Recency | 1 − (hours since last report) / (24 × 10) | [0, 1] | How recently waste was reported in this zone |
| F | Frequency | Weighted blend of 24h, 72h, 7d, 30d report counts | [0, 1] | Report density and momentum |
| D | Category Dominance | max(category_count) / total_reports | [0, 1] | Whether one waste type dominates the zone |
| L | Location History | Location weight × verification rate × nearby support | [0, 1] | Historical prediction accuracy at this location |
| T | Temporal Clustering | Hour/day concentration × cadence regularity × trend | [0, 1] | Whether reports follow a predictable time pattern |

## Scoring Function

```
confidence(z) = Σᵢ wᵢ · fᵢ(z)    where i ∈ {R, F, D, L, T}
```

Weights wᵢ are initialized uniformly and adapted via closed-loop feedback:

```
wᵢ ← wᵢ + α · (τ_target − precision) · contribution_i
```
"""


def generate_convergence_figure(config: dict, output_dir: Path) -> None:
    """Figure 1 — Precision convergence curve."""
    if not HAS_MPL:
        return
    from experiments.engine_harness import EngineConfig, run_engine, run_static_baseline

    eng = config.get("engine", {})
    cfg = EngineConfig.from_dict(eng)
    adaptive = run_engine(cfg, n_zones=48, n_iterations=20, seed=42)
    static = run_static_baseline(n_zones=48, n_iterations=20, seed=42)

    iters = [r.iteration for r in adaptive]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(iters, [r.precision for r in adaptive], "o-", color="#2563eb", linewidth=2, markersize=5, label="Adaptive")
    ax1.plot(iters, [r.precision for r in static], "x--", color="#94a3b8", linewidth=1.5, label="Static Baseline")
    ax1.axhline(y=0.75, color="#ef4444", linestyle=":", alpha=0.5, label="Target (τ=0.75)")
    ax1.set_xlabel("Iteration", fontsize=12); ax1.set_ylabel("Precision", fontsize=12)
    ax1.set_title("Precision Convergence", fontsize=14, fontweight="bold")
    ax1.legend(fontsize=10); ax1.grid(alpha=0.3); ax1.set_ylim(0, 1.05)

    ax2.plot(iters, [r.f1_score for r in adaptive], "o-", color="#10b981", linewidth=2, markersize=5, label="Adaptive F1")
    ax2.plot(iters, [r.f1_score for r in static], "x--", color="#94a3b8", linewidth=1.5, label="Static F1")
    ax2.set_xlabel("Iteration", fontsize=12); ax2.set_ylabel("F1 Score", fontsize=12)
    ax2.set_title("F1 Score Convergence", fontsize=14, fontweight="bold")
    ax2.legend(fontsize=10); ax2.grid(alpha=0.3); ax2.set_ylim(0, 1.05)

    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig1_convergence.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Figure 1: Convergence curve saved")


def generate_weight_evolution_figure(config: dict, output_dir: Path) -> None:
    """Figure 2 — Weight evolution over iterations."""
    if not HAS_MPL:
        return
    from experiments.engine_harness import EngineConfig, run_engine, FEATURE_NAMES

    eng = config.get("engine", {})
    cfg = EngineConfig.from_dict(eng)
    results = run_engine(cfg, n_zones=48, n_iterations=20, seed=42)

    iters = [r.iteration for r in results]
    colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"]

    plt.figure(figsize=(10, 5))
    for i, name in enumerate(FEATURE_NAMES):
        plt.plot(iters, [r.weights[i] for r in results], "o-", color=colors[i], linewidth=2, markersize=5, label=name)

    plt.xlabel("Iteration", fontsize=12); plt.ylabel("Normalized Weight", fontsize=12)
    plt.title("Adaptive Weight Evolution", fontsize=14, fontweight="bold")
    plt.legend(fontsize=11); plt.grid(alpha=0.3); plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig2_weight_evolution.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Figure 2: Weight evolution saved")


def generate_ablation_figure(ablation_results: dict, output_dir: Path) -> None:
    """Figure 5 — Feature ablation bar chart."""
    if not HAS_MPL:
        return
    from experiments.engine_harness import FEATURE_NAMES

    names, deltas = [], []
    for name in FEATURE_NAMES:
        key = f"no_{name}"
        if key in ablation_results:
            names.append(name); deltas.append(ablation_results[key]["delta_f1"])

    colors = ["#ef4444" if d > 0 else "#10b981" for d in deltas]
    plt.figure(figsize=(8, 5))
    bars = plt.bar(names, deltas, color=colors, alpha=0.85, edgecolor="white", linewidth=1.5)
    plt.xlabel("Removed Feature", fontsize=12); plt.ylabel("ΔF1 (Full − Ablated)", fontsize=12)
    plt.title("Feature Ablation Impact", fontsize=14, fontweight="bold")
    plt.axhline(y=0, color="black", linewidth=0.5); plt.grid(alpha=0.3, axis="y")

    for bar, d in zip(bars, deltas):
        plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.002,
                 f"{d:+.3f}", ha="center", va="bottom", fontsize=10, fontweight="bold")

    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig5_ablation.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Figure 5: Ablation bar chart saved")


def main():
    args = sys.argv[1:]
    quick = "--quick" in args
    skip_nyc = "--skip-nyc" in args
    skip_chicago = "--skip-chicago" in args

    print("=" * 70)
    print("  NHS Research — Full Experiment Suite v2.0")
    print("=" * 70)
    t_start = time.time()

    config = load_config()

    if quick:
        print("[Mode: QUICK — reduced parameter grid]")
        config["sensitivity"]["seeds"] = [42, 137]
        config["sensitivity"]["n_zones"] = [48, 192]
        config["sensitivity"]["n_iterations"] = [10, 20]
        config["sensitivity"]["tau"] = [0.50, 0.58]
        config["sensitivity"]["alpha"] = [0.05, 0.10]
        config["scalability"]["repetitions"] = 2
        config.setdefault("extended_cycles", {})["seeds"] = [42, 137]
        config.setdefault("hyperparameter_grid", {})["seeds"] = [42, 137]
        config.setdefault("zone_quality", {})["seeds"] = [42, 137]
        config["baselines"]["seeds"] = [42, 137]

    results_dir = RESEARCH_ROOT / "results"
    tables_dir = results_dir / "tables"
    figures_dir = results_dir / "figures"
    ext_dir = results_dir / "extended_cycles"
    tables_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)
    ext_dir.mkdir(parents=True, exist_ok=True)

    all_metrics = {}
    step = 0
    total_steps = 13

    # ── 1. Table I: Feature Definitions ──────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Table I — Feature Definitions...")
    (tables_dir / "table1_features.md").write_text(generate_table1(), encoding="utf-8")
    print("  ✓ Table I saved")

    # ── 2. Figures 1-2: Convergence & Weights ────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Figures 1-2 — Convergence & Weights...")
    generate_convergence_figure(config, figures_dir)
    generate_weight_evolution_figure(config, figures_dir)

    # ── 3. Extended Prediction Cycles ────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Extended Prediction Cycles...")
    from experiments.extended_cycles import run_extended_cycles, format_table as fmt_ext, plot_extended_cycles
    ext_results = run_extended_cycles(config)
    (ext_dir / "table_extended_cycles.md").write_text(fmt_ext(ext_results), encoding="utf-8")
    plot_extended_cycles(ext_results, figures_dir)
    all_metrics["extended_cycles"] = ext_results
    print(f"  ✓ Extended cycles: final F1={ext_results['final_f1_mean']:.4f}±{ext_results['final_f1_std']:.4f}")

    # ── 4. Baseline Comparison ───────────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Baseline Comparison (Table II)...")
    from experiments.baselines import run_baseline_comparison, format_table as fmt_baselines
    baseline_results = run_baseline_comparison(config)
    (tables_dir / "table2_baselines.md").write_text(fmt_baselines(baseline_results), encoding="utf-8")
    all_metrics["baselines"] = baseline_results
    print("  ✓ Table II saved")

    # ── 5. Sensitivity Study ─────────────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Sensitivity Study (Table III)...")
    from experiments.sensitivity import run_sensitivity_study, format_table as fmt_sensitivity
    sensitivity_results = run_sensitivity_study(config)
    (tables_dir / "table3_sensitivity.md").write_text(fmt_sensitivity(sensitivity_results), encoding="utf-8")
    all_metrics["sensitivity"] = sensitivity_results
    print("  ✓ Table III saved")

    # ── 6. Scalability ───────────────────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Scalability Benchmarks (Table IV)...")
    from experiments.scalability import run_scalability_study, format_table as fmt_scale, plot_scalability
    scale_results = run_scalability_study(config)
    (tables_dir / "table4_scalability.md").write_text(fmt_scale(scale_results), encoding="utf-8")
    plot_scalability(scale_results, figures_dir)
    all_metrics["scalability"] = scale_results
    print("  ✓ Table IV saved")

    # ── 7. Ablation Study ────────────────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Ablation Study (Table V)...")
    from experiments.ablation import run_ablation_study, format_table as fmt_ablation, format_explainability
    ablation_results = run_ablation_study(config)
    (tables_dir / "table5_ablation.md").write_text(fmt_ablation(ablation_results), encoding="utf-8")
    (tables_dir / "explainability.md").write_text(format_explainability(ablation_results), encoding="utf-8")
    generate_ablation_figure(ablation_results, figures_dir)
    all_metrics["ablation"] = {k: v for k, v in ablation_results.items() if k != "importance_ranking"}
    all_metrics["feature_importance"] = ablation_results.get("importance_ranking", {})
    print("  ✓ Table V saved")

    # ── 8. Multi-Zone Quality Test ───────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Multi-Zone Quality Test...")
    from experiments.zone_quality import run_zone_quality_study, format_table as fmt_zq
    zq_results = run_zone_quality_study(config)
    (tables_dir / "table_zone_quality.md").write_text(fmt_zq(zq_results), encoding="utf-8")
    all_metrics["zone_quality"] = zq_results
    print("  ✓ Zone quality table saved")

    # ── 9. Hyperparameter Grid Search ────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Hyperparameter Grid (α × τ)...")
    from experiments.hyperparam_grid import run_hyperparam_grid, format_table as fmt_hp, plot_heatmap
    hp_results = run_hyperparam_grid(config)
    (tables_dir / "table_hyperparam.md").write_text(fmt_hp(hp_results), encoding="utf-8")
    plot_heatmap(hp_results, figures_dir)
    all_metrics["hyperparameter_grid"] = hp_results
    print("  ✓ Hyperparameter grid saved")

    # ── 10. NYC 311 Real Data ────────────────────────────────────────────
    if not skip_nyc:
        step += 1
        print(f"\n[{step}/{total_steps}] NYC 311 Real Data...")
        try:
            from data.nyc311.fetch_data import fetch_nyc311
            from data.nyc311.transform import transform_records, generate_summary, build_zone_features
            from experiments.nyc_full_analysis import run_nyc_full_cycles, format_table as fmt_nyc, plot_nyc_convergence
            from experiments.bias_analysis import run_bias_analysis, format_table as fmt_bias, plot_bias

            raw_path = RESEARCH_ROOT / "data" / "nyc311" / "nyc311_raw.json"
            if raw_path.exists():
                with open(raw_path) as f:
                    raw = json.load(f)
            else:
                raw = fetch_nyc311(config, raw_path)

            if raw:
                records = transform_records(raw)
                summary = generate_summary(records)
                (RESEARCH_ROOT / "data" / "nyc311" / "dataset_summary.md").write_text(summary, encoding="utf-8")

                features, labels, zone_ids = build_zone_features(records, n_cycles=10)
                if features.size > 0:
                    # Full cycle analysis
                    nyc_cycle_results = run_nyc_full_cycles(features, labels, config)
                    (tables_dir / "table_nyc_cycles.md").write_text(fmt_nyc(nyc_cycle_results), encoding="utf-8")
                    plot_nyc_convergence(nyc_cycle_results, figures_dir)
                    all_metrics["nyc311"] = {
                        "n_records": len(records), "n_zones": len(zone_ids),
                        "n_cycles": nyc_cycle_results["n_cycles"],
                        "mean_f1": nyc_cycle_results["mean_f1"],
                        "std_f1": nyc_cycle_results["std_f1"],
                    }
                    print(f"  ✓ NYC 311: {len(records)} records, F1={nyc_cycle_results['mean_f1']:.4f}")

                    # Bias analysis
                    bias_results = run_bias_analysis(records, features, labels)
                    (tables_dir / "table_bias_analysis.md").write_text(fmt_bias(bias_results), encoding="utf-8")
                    plot_bias(bias_results, records, figures_dir)
                    all_metrics["bias_analysis"] = bias_results
                    print(f"  ✓ Bias analysis: Gini={bias_results['zone_gini_coefficient']:.4f}")

                out_path = RESEARCH_ROOT / "data" / "nyc311" / "nyc311_transformed.json"
                with open(out_path, "w") as f:
                    json.dump(records[:100], f, indent=2)
        except Exception as e:
            print(f"  ⚠ NYC 311 skipped: {e}")
    else:
        step += 1
        print(f"\n[{step}/{total_steps}] Skipping NYC 311 (--skip-nyc)")

    # ── 11. Chicago 311 Real Data ────────────────────────────────────────
    if not skip_chicago:
        step += 1
        print(f"\n[{step}/{total_steps}] Chicago 311 Real Data...")
        try:
            from data.chicago311.fetch_data import fetch_chicago311
            from data.chicago311.transform import transform_records as chi_transform, build_zone_features as chi_features, generate_summary as chi_summary
            from experiments.nyc_full_analysis import run_nyc_full_cycles
            from experiments.city_comparison import run_city_pipeline, format_comparison_table

            chi_raw_path = RESEARCH_ROOT / "data" / "chicago311" / "chicago311_raw.json"
            chi_raw = fetch_chicago311(config, chi_raw_path)

            if chi_raw:
                chi_records = chi_transform(chi_raw)
                chi_sum = chi_summary(chi_records)
                (RESEARCH_ROOT / "data" / "chicago311" / "dataset_summary.md").write_text(chi_sum, encoding="utf-8")

                chi_feat, chi_lab, chi_zones = chi_features(chi_records, n_cycles=10)
                if chi_feat.size > 0:
                    chi_result = run_city_pipeline(chi_feat, chi_lab, config, "Chicago")
                    all_metrics["chicago311"] = chi_result

                    # Cross-city comparison
                    city_results = []
                    if "nyc311" in all_metrics:
                        # Re-run NYC pipeline for comparison
                        nyc_raw_path = RESEARCH_ROOT / "data" / "nyc311" / "nyc311_raw.json"
                        if nyc_raw_path.exists():
                            with open(nyc_raw_path) as f:
                                nyc_raw = json.load(f)
                            from data.nyc311.transform import transform_records as nyc_tr, build_zone_features as nyc_bf
                            nyc_recs = nyc_tr(nyc_raw)
                            nyc_f, nyc_l, _ = nyc_bf(nyc_recs, n_cycles=10)
                            if nyc_f.size > 0:
                                nyc_result = run_city_pipeline(nyc_f, nyc_l, config, "NYC")
                                city_results.append(nyc_result)
                    city_results.append(chi_result)

                    if city_results:
                        (tables_dir / "table_city_comparison.md").write_text(
                            format_comparison_table(city_results), encoding="utf-8"
                        )
                    print(f"  ✓ Chicago: {len(chi_records)} records, F1={chi_result['f1_mean']:.4f}")
                else:
                    print("  ⚠ Chicago: insufficient zone data")
        except Exception as e:
            print(f"  ⚠ Chicago 311 skipped: {e}")
            import traceback; traceback.print_exc()
    else:
        step += 1
        print(f"\n[{step}/{total_steps}] Skipping Chicago 311 (--skip-chicago)")

    # ── 12. Save All Metrics ─────────────────────────────────────────────
    step += 1
    print(f"\n[{step}/{total_steps}] Saving consolidated metrics...")
    metrics_path = results_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2, default=str)
    print(f"  ✓ All metrics saved to {metrics_path}")

    # ── 13. Summary ──────────────────────────────────────────────────────
    elapsed = time.time() - t_start
    print(f"\n{'=' * 70}")
    print(f"  Completed in {elapsed:.1f}s")
    print(f"  Tables: {tables_dir}")
    print(f"  Figures: {figures_dir}")
    print(f"  Extended: {ext_dir}")
    print(f"  Metrics: {metrics_path}")
    print(f"{'=' * 70}")

    # Count outputs
    n_tables = len(list(tables_dir.glob("*.md")))
    n_figures = len(list(figures_dir.glob("*.*")))
    print(f"\n  📊 {n_tables} tables generated")
    print(f"  📈 {n_figures} figures generated")
    print(f"  📋 metrics.json with {len(all_metrics)} experiment groups")


if __name__ == "__main__":
    main()
