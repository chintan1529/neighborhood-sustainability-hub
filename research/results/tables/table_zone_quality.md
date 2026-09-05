# Table — Multi-Zone Prediction Quality

Prediction quality (mean ± std) across zone counts (20 iterations, 5 seeds).

| Zones | F1 (mean ± std) | Precision (mean ± std) | Recall (mean ± std) |
|---|---|---|---|
| 48 | 0.5844 ± 0.0457 | 0.6682 ± 0.0429 | 0.5321 ± 0.0540 |
| 96 | 0.5618 ± 0.0292 | 0.6562 ± 0.0321 | 0.4976 ± 0.0331 |
| 192 | 0.5781 ± 0.0290 | 0.6755 ± 0.0317 | 0.5073 ± 0.0275 |
| 384 | 0.5714 ± 0.0235 | 0.6618 ± 0.0280 | 0.5045 ± 0.0204 |

**Observation**: F1 remains stable across zone counts (48–384), confirming
the adaptive engine generalizes across spatial granularities.