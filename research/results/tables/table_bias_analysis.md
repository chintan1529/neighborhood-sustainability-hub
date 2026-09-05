# Table — Reporting Bias Analysis (NYC 311)

Analysis of 10000 complaints across 65 zones.

## Borough Distribution

| Borough | Count | % |
|---|---|---|
| BROOKLYN | 3207 | 32.1% |
| QUEENS | 2771 | 27.7% |
| BRONX | 1816 | 18.2% |
| MANHATTAN | 1500 | 15.0% |
| STATEN ISLAND | 704 | 7.0% |
| Unspecified | 2 | 0.0% |

## Spatial Reporting Inequality

- **Gini Coefficient**: 0.5356 (high inequality)
- **Top 10 zones**: 44.6% of all reports
- **Bottom 50% zones**: 11.2% of all reports
- **Reports per zone**: mean=153.8, std=154.1, median=98.0, max=620

## Temporal Bias

- Peak reporting hour: 9:00 (822 reports)

## Bias Implications

- Zones with low reporting rates may have equal or greater waste problems
- The NHS prediction engine may inherit reporting biases as historical patterns
- Borough-level disparities suggest uneven access to 311 services
- Temporal concentration means predictions may over-weight daytime patterns