# Table I — Feature Definitions

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
