"""
NHS Research — Publication-Quality Synthetic Data Generator
============================================================
Generates configurable benchmark datasets with:
  - Hotspot persistence (zones remain active across cycles)
  - Background noise (random low-density events)
  - Seasonality (periodic feature variation)
  - Category concentration
  - Event spikes (simulated surges)
  - Configurable zone count, density, time span

Deterministic via seed.  Outputs (features, labels) arrays.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np

FEATURE_NAMES = ["R", "F", "D", "L", "T"]
N_FEATURES = len(FEATURE_NAMES)

WASTE_CATEGORIES = ["plastic", "organic", "metal", "paper", "glass", "cardboard", "mixed"]


@dataclass
class GeneratorConfig:
    n_zones: int = 48
    n_cycles: int = 20
    reports_per_zone_mean: float = 6.0
    hotspot_persistence: float = 0.7
    background_noise: float = 0.15
    seasonality_amplitude: float = 0.2
    category_mix: List[float] = field(
        default_factory=lambda: [0.25, 0.20, 0.18, 0.20, 0.17]
    )
    spike_probability: float = 0.05
    seed: int = 42
    noise_level: float = 0.04

    @staticmethod
    def from_dict(d: dict, seed: int = 42) -> "GeneratorConfig":
        cfg = GeneratorConfig(seed=seed)
        for key in ["n_zones", "n_cycles", "reports_per_zone_mean",
                     "hotspot_persistence", "background_noise",
                     "seasonality_amplitude", "spike_probability", "noise_level"]:
            if key in d:
                setattr(cfg, key, d[key])
        if "category_mix" in d:
            cfg.category_mix = d["category_mix"]
        return cfg


@dataclass
class GeneratedDataset:
    """All data for one experiment run."""
    features: np.ndarray        # (n_cycles, n_zones, 5)
    labels: np.ndarray           # (n_cycles, n_zones) bool - hotspot ground truth
    zone_profiles: np.ndarray    # (n_zones, 5) base features
    zone_categories: List[str]   # dominant category per zone
    config: GeneratorConfig


def generate_dataset(config: GeneratorConfig) -> GeneratedDataset:
    """Generate a complete multi-cycle benchmark dataset."""
    rng = np.random.default_rng(config.seed)
    n = config.n_zones
    nc = config.n_cycles

    # Base zone profiles
    profiles = rng.uniform(0.15, 0.85, size=(n, N_FEATURES))

    # Assign dominant waste categories per zone
    categories = [WASTE_CATEGORIES[rng.integers(0, len(WASTE_CATEGORIES))] for _ in range(n)]

    # Zone-level bias (some zones are inherently more likely to be hotspots)
    zone_bias = rng.normal(0.0, 0.06, size=n)

    # True underlying weights (unknown to engine)
    true_weights = np.array([0.28, 0.24, 0.17, 0.16, 0.15])
    true_weights = true_weights / true_weights.sum()

    # Initialize hotspot state
    hotspot_state = rng.random(n) < 0.3  # ~30% initially active

    all_features = np.zeros((nc, n, N_FEATURES))
    all_labels = np.zeros((nc, n), dtype=bool)
    history = np.zeros((0, n), dtype=float)

    for cycle in range(nc):
        # --- Compute features ---
        last = history[-1] if history.shape[0] > 0 else np.zeros(n)
        short = history[-3:].mean(axis=0) if history.shape[0] > 0 else np.zeros(n)
        medium = history[-6:].mean(axis=0) if history.shape[0] > 0 else np.zeros(n)

        features = np.zeros((n, N_FEATURES))
        noise = rng.normal(0.0, config.noise_level, size=(n, N_FEATURES))

        # Seasonality: sinusoidal variation
        season = config.seasonality_amplitude * np.sin(2 * np.pi * cycle / max(nc, 1))

        features[:, 0] = 0.55 * last + 0.25 * short + 0.20 * profiles[:, 0] + season * 0.1
        features[:, 1] = 0.60 * short + 0.20 * medium + 0.20 * profiles[:, 1]
        features[:, 2] = 0.75 * profiles[:, 2] + 0.25 * short
        features[:, 3] = 0.85 * profiles[:, 3] + 0.15 * medium
        features[:, 4] = 0.50 * profiles[:, 4] + 0.25 * short + 0.25 * last + season * 0.05

        features = np.clip(features + noise, 0.0, 1.0)

        # --- Event spikes ---
        spike_mask = rng.random(n) < config.spike_probability
        features[spike_mask] = np.clip(features[spike_mask] * 1.5, 0.0, 1.0)

        # --- Ground truth labels ---
        # Hotspot persistence: active hotspots tend to stay active
        persist = hotspot_state & (rng.random(n) < config.hotspot_persistence)

        # New hotspots based on features
        logits = (features @ true_weights + zone_bias - 0.56) * 4.0
        probs = 1.0 / (1.0 + np.exp(-logits))
        new_hotspots = rng.binomial(1, probs).astype(bool)

        # Background noise: random activations
        bg_noise = rng.random(n) < config.background_noise

        # Combine: persistent OR new OR noise
        labels = persist | new_hotspots | bg_noise
        hotspot_state = labels

        all_features[cycle] = features
        all_labels[cycle] = labels
        history = np.vstack([history, labels.astype(float)])

    return GeneratedDataset(
        features=all_features,
        labels=all_labels,
        zone_profiles=profiles,
        zone_categories=categories,
        config=config,
    )


def generate_tabular(config: GeneratorConfig) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate flat (X, y) arrays suitable for sklearn classifiers.
    X: (n_cycles * n_zones, 5)  y: (n_cycles * n_zones,)
    """
    ds = generate_dataset(config)
    X = ds.features.reshape(-1, N_FEATURES)
    y = ds.labels.reshape(-1).astype(int)
    return X, y
