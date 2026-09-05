# Table V — Feature Ablation Study

Impact of removing each feature from the NHS adaptive prediction model.
ΔF1 = F1(full) − F1(ablated). Higher ΔF1 = more important feature.

| Configuration | F1 (mean) | F1 (std) | Precision | Recall | ΔF1 |
|---|---|---|---|---|---|
| Full Model (R+F+D+L+T) | 0.5844 | ±0.0457 | 0.6682 | 0.5321 | +0.0000 |
| Without R (Recency) | 0.0655 | ±0.0109 | 0.4400 | 0.0357 | +0.5189 |
| Without F (Frequency) | 0.0973 | ±0.0510 | 0.5333 | 0.0546 | +0.4871 |
| Without D (Category Dominance) | 0.3276 | ±0.0925 | 0.6740 | 0.2287 | +0.2568 |
| Without L (Location History) | 0.3231 | ±0.1428 | 0.6526 | 0.2264 | +0.2613 |
| Without T (Temporal Clustering) | 0.2514 | ±0.0697 | 0.6822 | 0.1636 | +0.3330 |
| All Disabled (Random) | 0.0000 | ±0.0000 | 0.0000 | 0.0000 | +0.5844 |

## Feature Importance Ranking

| Feature | Normalized Importance |
|---|---|
| R (Recency) | 0.2794 |
| F (Frequency) | 0.2623 |
| T (Temporal Clustering) | 0.1793 |
| L (Location History) | 0.1407 |
| D (Category Dominance) | 0.1383 |