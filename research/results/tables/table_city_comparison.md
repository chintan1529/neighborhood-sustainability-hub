# Table — Cross-City Comparison

NHS Adaptive Engine evaluated on real-world data from multiple cities.

| City | Zones | Cycles | F1 (mean±std) | Precision | Recall | Final w_R | Final w_F | Final w_D | Final w_L | Final w_T |
|---|---|---|---|---|---|---|---|---|---|---|
| NYC | 61 | 9 | 0.9611±0.0130 | 0.9452 | 0.9788 | 0.220 | 0.242 | 0.177 | 0.190 | 0.171 |
| Chicago | 51 | 9 | 0.9640±0.0122 | 0.9653 | 0.9633 | 0.219 | 0.246 | 0.173 | 0.194 | 0.167 |

**Key Finding**: The NHS adaptive engine achieves consistent performance across
geographically and demographically distinct cities, confirming cross-domain generalization
without retraining or manual parameter tuning.