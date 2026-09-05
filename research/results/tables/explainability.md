# Feature Contribution Decomposition

For any zone, the hotspot score is fully decomposable:

```
score = R × w_R + F × w_F + D × w_D + L × w_L + T × w_T
```

Example (Zone Z₁, Cycle 15):

| Feature | Value | Weight | Contribution | % of Score |
|---|---|---|---|---|
| R (Recency) | 0.72 | 0.24 | 0.173 | 26.0% |
| F (Frequency) | 0.81 | 0.26 | 0.211 | 31.7% |
| D (Category Dominance) | 0.45 | 0.17 | 0.077 | 11.5% |
| L (Location History) | 0.68 | 0.17 | 0.116 | 17.4% |
| T (Temporal Clustering) | 0.55 | 0.16 | 0.088 | 13.3% |
| **Total Score** | | | **0.663** | **100%** |

This transparency enables municipal administrators to understand *why* a zone is flagged,
facilitating governance decisions and resource allocation without black-box opacity.