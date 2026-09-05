# Image Classifier — Research Pipeline Decision

## Status: Documented (Not Evaluated in Research)

The NHS platform includes a production **waste image classifier** powered by Google Gemini Vision API (`src/app/api/classify/route.ts`). This classifier categorizes uploaded waste images into 7 categories (cardboard, metal, paper, plastic, glass, organic, mixed) and influences the **D (Category Dominance)** feature in the predictive engine.

## Role in the Prediction Pipeline

```
User uploads image → Gemini Vision classifies → Category stored in database
                                                        ↓
                                            D feature = max(category_count) / total_reports
                                                        ↓
                                            Hotspot score = Σ(wᵢ × fᵢ)
```

## Why Not Evaluated in Research

1. **API dependency**: The classifier requires live Gemini API access and real uploaded images, making it unsuitable for offline, reproducible research evaluation.

2. **D feature independence**: In the research pipeline:
   - **Synthetic data**: D values are simulated from configurable category distributions
   - **NYC 311 data**: D is computed from complaint-type metadata (e.g., "Dirty Condition" → "mixed")
   - **Chicago 311 data**: D is computed from service request type metadata

3. **Ablation coverage**: The ablation study (Table V) measures D's contribution to overall prediction quality. Removing D causes ΔF1 > +0.23, confirming its importance regardless of the source (classifier vs metadata).

## Future Work

A field evaluation measuring the classifier's impact on D feature quality in production deployment is a direction for future research. This would require:
- A controlled deployment with and without the classifier
- Ground-truth waste category labeling by field workers
- Measuring D feature accuracy: classifier-derived vs metadata-derived
