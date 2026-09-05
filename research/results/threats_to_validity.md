# Threats to Validity

## Internal Validity

1. **Simulated ground truth**: In synthetic experiments, ground truth hotspot labels are generated via a sigmoid probability model with known true weights. While this isolates the adaptive mechanism's convergence behavior, it does not capture all real-world stochastic dynamics (e.g., policy interventions, extreme weather events).

2. **Feature computation fidelity**: The pure-Python research harness faithfully mirrors the TypeScript production engine's mathematics (verified via line-by-line correspondence). However, minor floating-point differences between JavaScript and Python runtimes may exist at negligible scale (< 1e-10).

3. **Convergence gating**: The adaptive engine gates weight updates once precision stabilizes near the target (|precision − τ_target| < δ). This prevents overfitting but may also prevent the engine from escaping local optima in highly non-stationary environments.

4. **Evaluation methodology**: Baseline ML models (Random Forest, Logistic Regression) are evaluated using chronological train/test splits (60/40), while the NHS adaptive engine is evaluated on rolling online predictions. This methodological difference favors ML baselines that have access to historical training data but reflects the real-world deployment scenario where NHS must predict without prior labeled data.

## External Validity

1. **Geographic scope**: The system has been evaluated on two US cities (New York City, Chicago) using their respective 311 open data platforms. Transferability to cities with different administrative structures, reporting cultures, or waste management practices (e.g., European, Asian, or developing-world cities) has not been empirically validated.

2. **Complaint type coverage**: Only sanitation-related complaint types are used. The system's applicability to other urban service domains (e.g., infrastructure maintenance, public health) requires separate evaluation.

3. **Temporal coverage**: Data spans approximately one year (2024–2025). Long-term seasonal dynamics, multi-year trends, and regime changes (e.g., new waste policies) are not captured.

4. **Geohash granularity**: Precision-5 geohashes (~4.9 km² zones) may be too coarse for dense urban cores and too fine for suburban areas. The optimal spatial resolution is deployment-dependent.

## Construct Validity

1. **Five-feature schema**: The NHS engine uses five interpretable features (R, F, D, L, T). While ablation studies confirm each feature's contribution, important predictors may be missing:
   - **Weather conditions**: Rain, temperature, and wind affect waste generation patterns
   - **Demographic factors**: Population density, income levels, and building types
   - **Policy events**: Holidays, strikes, special collection schedules
   - **Infrastructure**: Proximity to commercial zones, restaurants, or construction sites

2. **Category Dominance (D) feature**: In production, D is informed by the Gemini Vision AI classifier. In research evaluation, D is computed from complaint metadata (NYC/Chicago 311 categories) or simulated distributions. The classifier's accuracy may affect D quality in production deployments.

3. **Precision as primary optimization target**: The adaptive engine optimizes for precision (minimizing false positives). This design choice prioritizes resource efficiency (avoid sending trucks to non-hotspots) but may under-optimize recall (missing actual hotspots). The precision-recall tradeoff is tunable via τ but the optimization direction is fixed.

4. **Linear scoring model**: The weighted linear combination assumes feature independence and linear contributions. Non-linear feature interactions (e.g., high recency AND high frequency being super-additive) are not captured. This is a deliberate design choice favoring interpretability over model expressiveness.
