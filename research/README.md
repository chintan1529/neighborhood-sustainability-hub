# NHS Research Benchmark Suite v2.0

Fully reproducible research validation pipeline for the Neighborhood Sustainability Hub (NHS) predictive hotspot engine. Generates all tables, figures, and metrics for IEEE paper submission.

## Quickstart (One-Command Reproduction)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the entire suite (all experiments, ~10-15 minutes)
python run_all.py

# Quick mode (reduced parameter grid, ~2-3 minutes)
python run_all.py --quick

# Skip network-dependent fetches
python run_all.py --skip-nyc --skip-chicago
```

## Outputs

All results are saved to `results/`:

| Directory | Contents |
|---|---|
| `results/tables/` | Publication-ready markdown tables |
| `results/figures/` | High-resolution figures (PNG + PDF, 300 DPI) |
| `results/extended_cycles/` | Extended prediction cycle analysis |
| `results/metrics.json` | Raw compiled metrics (all experiments) |
| `results/threats_to_validity.md` | Structured validity analysis |
| `results/ethics_privacy.md` | Ethics and privacy statement |

## Experiments

| # | Experiment | Output | Description |
|---|---|---|---|
| 1 | Feature Definitions | Table I | 5-feature schema documentation |
| 2 | Convergence & Weights | Figs 1-2 | Precision/F1 convergence, weight evolution |
| 3 | Extended Cycles | Table + Fig | 20 cycles × 5 seeds, per-cycle tracking |
| 4 | Baseline Comparison | Table II | 5 models on identical data (5 seeds) |
| 5 | Sensitivity Study | Table III | 6-parameter sweep (200+ configs) |
| 6 | Scalability | Table IV + Fig 3 | Runtime/memory at 48-384 zones |
| 7 | Ablation | Table V + Fig 5 | Feature importance via leave-one-out |
| 8 | Zone Quality | Table | F1/Precision/Recall at 48-384 zones |
| 9 | Hyperparameter Grid | Table + Fig 4 | α × τ F1 heatmap |
| 10 | NYC 311 Analysis | Table + Fig 6 | Full cycle prediction on real NYC data |
| 11 | Chicago 311 Analysis | Table | Second city validation |
| 12 | City Comparison | Table | Cross-city generalization |
| 13 | Bias Analysis | Table + Fig 7 | Reporting inequality analysis |

## Datasets

### Synthetic
- Parameterized generator with configurable zones, cycles, noise, and seasonality
- Deterministic via seed — identical results on any platform
- Location: `data/synthetic/generator.py`

### NYC 311 Open Data
- Source: [NYC 311 Service Requests](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9)
- 10,000 sanitation-related complaints (Dirty Condition, Illegal Dumping, etc.)
- License: Public domain (NYC Open Data Terms)
- Location: `data/nyc311/`

### Chicago 311 Open Data
- Source: [Chicago 311 Service Requests](https://data.cityofchicago.org/Service-Requests/311-Service-Requests/v6vf-nfxy)
- Sanitation complaints (Garbage Cart, Fly Dumping, etc.)
- License: Public domain (Chicago Open Data Terms)
- Includes synthetic fallback if API is unreachable
- Location: `data/chicago311/`

## Directory Structure

```
research/
├── config.yaml              # Master configuration
├── run_all.py                # Orchestrator (one-command reproduction)
├── requirements.txt          # Python dependencies
├── paper_claims.md           # Validated, defensible paper statements
├── data/
│   ├── synthetic/generator.py    # Parameterized benchmark generator
│   ├── nyc311/                   # NYC 311 data pipeline
│   └── chicago311/               # Chicago 311 data pipeline
├── experiments/
│   ├── engine_harness.py         # Core engine (Python port of TypeScript)
│   ├── baselines.py              # 5-model comparison
│   ├── sensitivity.py            # Parameter sweep
│   ├── scalability.py            # Runtime/memory benchmarks
│   ├── ablation.py               # Feature importance
│   ├── extended_cycles.py        # 20-cycle convergence tracking
│   ├── zone_quality.py           # Multi-zone quality evaluation
│   ├── hyperparam_grid.py        # α × τ grid search
│   ├── nyc_full_analysis.py      # NYC full cycle prediction
│   ├── city_comparison.py        # Cross-city comparison
│   └── bias_analysis.py          # Reporting bias analysis
└── results/
    ├── tables/                   # All publication tables
    ├── figures/                  # All publication figures
    ├── extended_cycles/          # Extended cycle results
    ├── metrics.json              # Consolidated raw metrics
    ├── threats_to_validity.md    # Validity analysis
    └── ethics_privacy.md         # Ethics statement
```

## Model Matching

`experiments/engine_harness.py` is a faithful, line-by-line mathematical equivalent of:
- `src/lib/predictive-engine.ts`
- `src/lib/adaptive-weight-optimizer.ts`

## Statistical Rigor

- All experiments use **5 independent random seeds** (42, 137, 256, 512, 1024)
- All metrics reported as **mean ± standard deviation**
- Baseline comparisons use identical data and chronological train/test splits
- Results are deterministically reproducible

## Dependencies

```
numpy>=1.24.0
pandas>=2.0.0
matplotlib>=3.7.0
seaborn>=0.12.0
scikit-learn>=1.3.0
pyyaml>=6.0
requests>=2.31.0
```

## Expected Runtime

| Mode | Approximate Time |
|---|---|
| `--quick` | 2-3 minutes |
| Full (skip network) | 8-10 minutes |
| Full (with data fetch) | 10-15 minutes |
