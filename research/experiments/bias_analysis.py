"""
NHS Research — Reporting Bias Analysis (Item #8)
==================================================
Analyzes bias in NYC 311 reporting data:
  - Report density per borough
  - Predicted hotspot distribution vs complaint density
  - Gini coefficient for reporting inequality
"""
from __future__ import annotations
import json, sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

def gini_coefficient(values: np.ndarray) -> float:
    """Compute Gini coefficient for inequality measurement."""
    sorted_vals = np.sort(values)
    n = len(sorted_vals)
    if n == 0 or sorted_vals.sum() == 0:
        return 0.0
    index = np.arange(1, n + 1)
    return float((2 * np.sum(index * sorted_vals) - (n + 1) * np.sum(sorted_vals)) / (n * np.sum(sorted_vals)))

def run_bias_analysis(records: List[Dict], features: np.ndarray = None,
                      labels: np.ndarray = None) -> Dict[str, Any]:
    """Analyze reporting bias in NYC 311 data."""
    # Borough distribution
    borough_counts = Counter(r.get("borough", "Unknown") for r in records)
    total = len(records)

    borough_stats = {}
    for b, cnt in borough_counts.most_common():
        borough_stats[b] = {
            "count": cnt,
            "percentage": round(cnt / total * 100, 1),
        }

    # Zone-level report density
    zone_counts = Counter(r["zone_id"] for r in records)
    zone_values = np.array(list(zone_counts.values()), dtype=float)
    gini = gini_coefficient(zone_values)

    # Top/bottom zone comparison
    sorted_zones = sorted(zone_counts.items(), key=lambda x: x[1], reverse=True)
    top10_pct = sum(c for _, c in sorted_zones[:10]) / total * 100
    bottom50_pct = sum(c for _, c in sorted_zones[len(sorted_zones)//2:]) / total * 100

    # Time-of-day bias
    hour_counts = Counter()
    for r in records:
        try:
            hour = int(r["created_at"][11:13])
            hour_counts[hour] += 1
        except (ValueError, IndexError, KeyError):
            pass

    peak_hour = hour_counts.most_common(1)[0] if hour_counts else (0, 0)

    # Category bias
    cat_counts = Counter(r.get("category", "mixed") for r in records)

    return {
        "total_records": total,
        "n_zones": len(zone_counts),
        "borough_distribution": borough_stats,
        "zone_gini_coefficient": round(gini, 4),
        "top10_zones_pct": round(top10_pct, 1),
        "bottom50_zones_pct": round(bottom50_pct, 1),
        "peak_reporting_hour": peak_hour[0] if hour_counts else 0,
        "peak_hour_count": peak_hour[1] if hour_counts else 0,
        "category_distribution": dict(cat_counts.most_common()),
        "zone_report_stats": {
            "mean": round(float(zone_values.mean()), 1),
            "std": round(float(zone_values.std()), 1),
            "median": round(float(np.median(zone_values)), 1),
            "max": int(zone_values.max()),
            "min": int(zone_values.min()),
        },
    }

def format_table(results: Dict[str, Any]) -> str:
    lines = [
        "# Table — Reporting Bias Analysis (NYC 311)", "",
        f"Analysis of {results['total_records']} complaints across {results['n_zones']} zones.", "",
        "## Borough Distribution", "",
        "| Borough | Count | % |", "|---|---|---|",
    ]
    for b, s in results["borough_distribution"].items():
        lines.append(f"| {b} | {s['count']} | {s['percentage']}% |")

    lines += [
        "", "## Spatial Reporting Inequality", "",
        f"- **Gini Coefficient**: {results['zone_gini_coefficient']:.4f} "
        f"({'high' if results['zone_gini_coefficient'] > 0.5 else 'moderate'} inequality)",
        f"- **Top 10 zones**: {results['top10_zones_pct']}% of all reports",
        f"- **Bottom 50% zones**: {results['bottom50_zones_pct']}% of all reports",
        f"- **Reports per zone**: mean={results['zone_report_stats']['mean']}, "
        f"std={results['zone_report_stats']['std']}, "
        f"median={results['zone_report_stats']['median']}, "
        f"max={results['zone_report_stats']['max']}",
        "", "## Temporal Bias", "",
        f"- Peak reporting hour: {results['peak_reporting_hour']}:00 "
        f"({results['peak_hour_count']} reports)",
        "", "## Bias Implications", "",
        "- Zones with low reporting rates may have equal or greater waste problems",
        "- The NHS prediction engine may inherit reporting biases as historical patterns",
        "- Borough-level disparities suggest uneven access to 311 services",
        "- Temporal concentration means predictions may over-weight daytime patterns",
    ]
    return "\n".join(lines)

def plot_bias(results: Dict[str, Any], records: List[Dict], output_dir: Path) -> None:
    if not HAS_MPL: return
    output_dir.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    # Borough distribution
    boroughs = list(results["borough_distribution"].keys())
    counts = [results["borough_distribution"][b]["count"] for b in boroughs]
    colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"]
    axes[0].barh(boroughs, counts, color=colors[:len(boroughs)], alpha=0.85)
    axes[0].set_xlabel("Number of Reports", fontsize=11)
    axes[0].set_title("Reports by Borough", fontsize=13, fontweight="bold")
    axes[0].grid(alpha=0.3, axis="x")

    # Zone report distribution (histogram)
    zone_counts = Counter(r["zone_id"] for r in records)
    zone_vals = list(zone_counts.values())
    axes[1].hist(zone_vals, bins=25, color="#2563eb", alpha=0.75, edgecolor="white")
    axes[1].axvline(x=np.mean(zone_vals), color="#ef4444", linestyle="--", label=f"Mean={np.mean(zone_vals):.0f}")
    axes[1].set_xlabel("Reports per Zone", fontsize=11)
    axes[1].set_ylabel("Number of Zones", fontsize=11)
    axes[1].set_title(f"Zone Report Distribution (Gini={results['zone_gini_coefficient']:.3f})",
                       fontsize=13, fontweight="bold")
    axes[1].legend(fontsize=10)
    axes[1].grid(alpha=0.3)

    # Temporal pattern
    hour_counts = Counter()
    for r in records:
        try:
            hour = int(r["created_at"][11:13])
            hour_counts[hour] += 1
        except: pass
    hours = list(range(24))
    hcounts = [hour_counts.get(h, 0) for h in hours]
    axes[2].bar(hours, hcounts, color="#10b981", alpha=0.8, edgecolor="white")
    axes[2].set_xlabel("Hour of Day", fontsize=11)
    axes[2].set_ylabel("Number of Reports", fontsize=11)
    axes[2].set_title("Temporal Reporting Pattern", fontsize=13, fontweight="bold")
    axes[2].grid(alpha=0.3, axis="y")

    plt.tight_layout()
    for ext in ["png", "pdf"]:
        plt.savefig(output_dir / f"fig7_bias_analysis.{ext}", dpi=300, bbox_inches="tight")
    plt.close()
    print("  ✓ Bias analysis figure saved")
