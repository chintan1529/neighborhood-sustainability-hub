"""
NHS Research — NYC 311 Data Transformer
========================================
Transforms raw NYC 311 complaint records into NHS-compatible format
and generates feature matrices for experiment evaluation.

Category mapping:
  NYC 311 Complaint Type -> NHS Waste Category

Schema output: (latitude, longitude, created_at, category, zone_id, source)
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

# Category mapping: NYC 311 complaint -> NHS waste category
CATEGORY_MAP = {
    "Dirty Condition": "mixed",
    "Dirty Conditions": "mixed",
    "Illegal Dumping": "mixed",
    "Sanitation Condition": "mixed",
    "Overflowing Litter Baskets": "plastic",
    "Overflowing Recycling Baskets": "plastic",
    "Dumpster Complaint": "mixed",
    "Litter Basket Complaint": "plastic",
    "Litter Basket Request": "plastic",
    "Litter Basket / Request": "plastic",
    "Electronics Waste": "metal",
    "Electronics Waste Appointment": "metal",
    "Recycling Enforcement": "plastic",
    "Recycling Basket Complaint": "plastic",
    "Industrial Waste": "mixed",
    "Sanitation Worker or Vehicle Complaint": "mixed",
}

# Geohash encoding (simplified — precision 5 gives ~4.9km² zones)
def _encode_geohash(lat: float, lon: float, precision: int = 5) -> str:
    """Simple geohash encoder matching ngeohash behavior."""
    BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_range = (-90.0, 90.0)
    lon_range = (-180.0, 180.0)
    bits = [16, 8, 4, 2, 1]
    result = []
    ch = 0
    bit = 0
    is_lon = True

    while len(result) < precision:
        if is_lon:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon >= mid:
                ch |= bits[bit]
                lon_range = (mid, lon_range[1])
            else:
                lon_range = (lon_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat >= mid:
                ch |= bits[bit]
                lat_range = (mid, lat_range[1])
            else:
                lat_range = (lat_range[0], mid)

        is_lon = not is_lon
        bit += 1
        if bit >= 5:
            result.append(BASE32[ch])
            ch = 0
            bit = 0

    return "".join(result)


def transform_records(
    raw_records: List[Dict[str, Any]],
    geohash_precision: int = 5,
) -> List[Dict[str, Any]]:
    """Transform raw NYC 311 records to NHS-compatible schema."""
    transformed = []
    skipped = 0

    for rec in raw_records:
        try:
            lat = float(rec.get("latitude", 0))
            lon = float(rec.get("longitude", 0))
            if lat == 0 or lon == 0:
                skipped += 1
                continue

            complaint = rec.get("complaint_type", "")
            category = CATEGORY_MAP.get(complaint, "mixed")
            zone_id = _encode_geohash(lat, lon, geohash_precision)

            transformed.append({
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "created_at": rec.get("created_date", ""),
                "category": category,
                "original_complaint": complaint,
                "descriptor": rec.get("descriptor", ""),
                "borough": rec.get("borough", ""),
                "zone_id": zone_id,
                "source": "nyc311",
            })
        except (ValueError, TypeError):
            skipped += 1

    print(f"[Transform] Transformed {len(transformed)} records ({skipped} skipped)")
    return transformed


def build_zone_features(
    records: List[Dict[str, Any]],
    n_cycles: int = 10,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Build (features, labels) arrays from real records for engine evaluation.

    Groups records by zone_id and time window, computing the 5 NHS features:
      R (Recency): Normalized time since last report
      F (Frequency): Report count in recent windows
      D (Dominance): Category concentration
      L (Location): Persistent zone activity
      T (Temporal): Hour/day concentration

    Returns:
        features: (n_cycles, n_zones, 5)
        labels: (n_cycles, n_zones) True if zone had reports in next cycle
        zone_ids: list of zone_id strings
    """
    if not records:
        return np.array([]), np.array([]), []

    # Sort by time
    records = sorted(records, key=lambda r: r["created_at"])

    # Get time range
    times = [datetime.fromisoformat(r["created_at"].replace("Z", "+00:00").split(".")[0])
             for r in records]
    t_min, t_max = min(times), max(times)
    total_hours = (t_max - t_min).total_seconds() / 3600
    cycle_hours = total_hours / n_cycles if n_cycles > 0 else 24

    # Group by zone
    zones: Dict[str, List] = {}
    for i, rec in enumerate(records):
        zid = rec["zone_id"]
        if zid not in zones:
            zones[zid] = []
        zones[zid].append((times[i], rec))

    # Filter to zones with enough data
    active_zones = {z: v for z, v in zones.items() if len(v) >= 3}
    zone_ids = sorted(active_zones.keys())
    n_zones = len(zone_ids)

    if n_zones == 0:
        return np.array([]), np.array([]), []

    features = np.zeros((n_cycles, n_zones, 5))
    labels = np.zeros((n_cycles, n_zones), dtype=bool)

    for cycle in range(n_cycles):
        cycle_start = t_min + __import__("datetime").timedelta(hours=cycle * cycle_hours)
        cycle_end = cycle_start + __import__("datetime").timedelta(hours=cycle_hours)

        for z_idx, zid in enumerate(zone_ids):
            zone_records = active_zones[zid]

            # Reports in this cycle
            cycle_recs = [(t, r) for t, r in zone_records if cycle_start <= t < cycle_end]
            # Reports before this cycle
            past_recs = [(t, r) for t, r in zone_records if t < cycle_start]
            # Reports in next cycle (for labels)
            if cycle < n_cycles - 1:
                next_start = cycle_end
                next_end = next_start + __import__("datetime").timedelta(hours=cycle_hours)
                next_recs = [(t, r) for t, r in zone_records if next_start <= t < next_end]
                labels[cycle, z_idx] = len(next_recs) > 0

            # R (Recency): How recently did last report occur?
            if past_recs:
                hours_since = (cycle_start - past_recs[-1][0]).total_seconds() / 3600
                features[cycle, z_idx, 0] = max(0, 1 - hours_since / (24 * 10))
            elif cycle_recs:
                features[cycle, z_idx, 0] = 0.8

            # F (Frequency): Report density
            recent_count = len(cycle_recs) + len([r for r in past_recs
                                                    if (cycle_start - r[0]).total_seconds() < cycle_hours * 3 * 3600])
            features[cycle, z_idx, 1] = min(1.0, recent_count / 8)

            # D (Dominance): Category concentration
            cats = [r["category"] for _, r in (cycle_recs + past_recs[-10:])]
            if cats:
                most_common = Counter(cats).most_common(1)[0][1]
                features[cycle, z_idx, 2] = most_common / len(cats)

            # L (Location): Zone historical activity
            total = len(zone_records)
            features[cycle, z_idx, 3] = min(1.0, total / 20)

            # T (Temporal): Temporal concentration
            hours = [t.hour for t, _ in (cycle_recs + past_recs[-10:])]
            if hours:
                hour_counts = Counter(hours)
                peak_count = hour_counts.most_common(1)[0][1]
                features[cycle, z_idx, 4] = peak_count / len(hours)

    features = np.clip(features, 0, 1)
    print(f"[Transform] Built features: {features.shape} for {n_zones} zones, {n_cycles} cycles")

    return features, labels, zone_ids


def generate_summary(records: List[Dict[str, Any]]) -> str:
    """Generate a text summary of the transformed dataset."""
    if not records:
        return "No records transformed."

    cats = Counter(r["category"] for r in records)
    boroughs = Counter(r.get("borough", "Unknown") for r in records)
    zones = Counter(r["zone_id"] for r in records)

    lines = [
        "# NYC 311 Dataset Summary",
        "",
        f"**Total records**: {len(records)}",
        f"**Unique zones**: {len(zones)}",
        f"**Date range**: {records[0]['created_at'][:10]} to {records[-1]['created_at'][:10]}",
        "",
        "## Category Distribution",
        "",
        "| NHS Category | Count | % |",
        "|---|---|---|",
    ]
    for cat, cnt in cats.most_common():
        lines.append(f"| {cat} | {cnt} | {cnt/len(records)*100:.1f}% |")

    lines.extend([
        "",
        "## Borough Distribution",
        "",
        "| Borough | Count | % |",
        "|---|---|---|",
    ])
    for b, cnt in boroughs.most_common():
        lines.append(f"| {b} | {cnt} | {cnt/len(records)*100:.1f}% |")

    lines.extend([
        "",
        f"## Zone Statistics",
        "",
        f"- Zones with ≥3 reports: {sum(1 for c in zones.values() if c >= 3)}",
        f"- Zones with ≥10 reports: {sum(1 for c in zones.values() if c >= 10)}",
        f"- Max reports in a zone: {max(zones.values())}",
        f"- Median reports per zone: {sorted(zones.values())[len(zones)//2]}",
    ])

    return "\n".join(lines)


if __name__ == "__main__":
    raw_path = Path(__file__).resolve().parent / "nyc311_raw.json"
    if not raw_path.exists():
        print(f"[Transform] Raw data not found at {raw_path}. Run fetch_data.py first.")
        sys.exit(1)

    with open(raw_path) as f:
        raw = json.load(f)

    records = transform_records(raw)
    summary = generate_summary(records)
    print(summary)

    out_path = Path(__file__).resolve().parent / "nyc311_transformed.json"
    with open(out_path, "w") as f:
        json.dump(records, f, indent=2)
    print(f"\n[Transform] Saved to {out_path}")

    summary_path = Path(__file__).resolve().parent / "dataset_summary.md"
    summary_path.write_text(summary, encoding="utf-8")
