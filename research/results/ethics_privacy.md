# Ethics and Privacy Statement

## Data Sources

All data used in this research is obtained from **publicly available open data portals** under their respective open data licenses:

1. **NYC 311 Open Data**: Service requests from the City of New York's 311 system.
   - Source: https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9
   - License: NYC Open Data Terms of Use (public domain)
   - No API key or authentication required

2. **Chicago 311 Open Data**: Service requests from the City of Chicago's 311 system.
   - Source: https://data.cityofchicago.org/Service-Requests/311-Service-Requests/v6vf-nfxy
   - License: Chicago Open Data Terms of Use (public domain)
   - No API key or authentication required

3. **Synthetic Data**: Parameterized benchmark datasets generated algorithmically with no connection to real individuals.

## Privacy Protections

1. **No personal identifiable information (PII)**: The datasets contain only complaint type, geographic coordinates, and timestamps. No names, addresses, phone numbers, or other PII is accessed or stored.

2. **Spatial anonymization**: Geographic data is aggregated into geohash precision-5 zones (~4.9 km² per zone), preventing identification of individual households or businesses. The raw latitude/longitude coordinates are used only for zone assignment and are not retained in the research outputs.

3. **Temporal aggregation**: Individual complaint timestamps are grouped into multi-day prediction cycles, further preventing temporal de-anonymization.

4. **No personal data misuse**: The research does not attempt to identify, track, or profile individual complainants. All analysis operates at the zone level.

## Ethical Considerations

1. **Reporting bias awareness**: We explicitly acknowledge and analyze reporting bias in the 311 data (see Reporting Bias Analysis). Communities with lower 311 usage may be underrepresented in the prediction model, potentially leading to inequitable service allocation. This is documented as a limitation and direction for future work.

2. **No discriminatory features**: The prediction engine uses only waste-related features (Recency, Frequency, Category Dominance, Location History, Temporal Clustering). No demographic, racial, income, or other protected-class features are used directly or as proxies.

3. **Transparency and interpretability**: The linear scoring model enables full algorithmic transparency. Municipal administrators can inspect and audit the exact contribution of each feature to any prediction, supporting accountable governance.

4. **Open reproducibility**: All code, configurations, and data pipelines are provided for full reproducibility, enabling independent verification of our claims.

## Responsible Deployment Considerations

- The system is designed as a **decision-support tool**, not an autonomous decision-maker
- Human oversight is maintained in the feedback loop (verified/missed predictions require human input)
- Weight adaptation can be monitored and manually overridden by administrators
- The system should be regularly audited for equitable service distribution across zones
