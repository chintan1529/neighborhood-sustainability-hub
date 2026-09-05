"""
NHS Research — Chicago 311 Data Transformer
=============================================
Transforms raw Chicago 311 records into NHS-compatible format.
Category mapping: Chicago SR Type -> NHS Waste Category
"""
from __future__ import annotations
import json, sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

CATEGORY_MAP = {
    "Garbage Cart Maintenance": "mixed",
    "Garbage Cart Black Maintenance/Replacement": "mixed",
    "Fly Dumping": "mixed",
    "Sanitation Code Violation": "mixed",
    "Overflowing City Receptacle": "plastic",
    "Recycling - Loss/Damage/Replacement": "plastic",
}

def _encode_geohash(lat: float, lon: float, precision: int = 5) -> str:
    BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_range, lon_range = (-90.0, 90.0), (-180.0, 180.0)
    bits = [16, 8, 4, 2, 1]
    result, ch, bit, is_lon = [], 0, 0, True
    while len(result) < precision:
        if is_lon:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon >= mid: ch |= bits[bit]; lon_range = (mid, lon_range[1])
            else: lon_range = (lon_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat >= mid: ch |= bits[bit]; lat_range = (mid, lat_range[1])
            else: lat_range = (lat_range[0], mid)
        is_lon = not is_lon; bit += 1
        if bit >= 5: result.append(BASE32[ch]); ch = 0; bit = 0
    return "".join(result)

def transform_records(raw_records: List[Dict], geohash_precision: int = 5) -> List[Dict]:
    transformed, skipped = [], 0
    for rec in raw_records:
        try:
            lat = float(rec.get("latitude", 0))
            lon = float(rec.get("longitude", 0))
            if lat == 0 or lon == 0: skipped += 1; continue
            sr_type = rec.get("sr_type", "")
            category = CATEGORY_MAP.get(sr_type, "mixed")
            zone_id = _encode_geohash(lat, lon, geohash_precision)
            transformed.append({
                "latitude": round(lat, 6), "longitude": round(lon, 6),
                "created_at": rec.get("created_date", ""),
                "category": category, "original_complaint": sr_type,
                "borough": f"Area_{rec.get('community_area', 'Unknown')}",
                "zone_id": zone_id, "source": "chicago311",
            })
        except (ValueError, TypeError): skipped += 1
    print(f"[Chicago Transform] {len(transformed)} records ({skipped} skipped)")
    return transformed

def build_zone_features(records: List[Dict], n_cycles: int = 10) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """Build (features, labels) arrays from Chicago records — same logic as NYC."""
    if not records: return np.array([]), np.array([]), []
    records = sorted(records, key=lambda r: r["created_at"])
    times = []
    for r in records:
        try:
            t = r["created_at"].replace("Z", "+00:00").split(".")[0]
            times.append(datetime.fromisoformat(t))
        except: times.append(datetime(2024, 6, 1))

    t_min, t_max = min(times), max(times)
    total_hours = max((t_max - t_min).total_seconds() / 3600, 1)
    cycle_hours = total_hours / n_cycles

    zones: Dict[str, List] = {}
    for i, rec in enumerate(records):
        zid = rec["zone_id"]
        if zid not in zones: zones[zid] = []
        zones[zid].append((times[i], rec))

    active_zones = {z: v for z, v in zones.items() if len(v) >= 3}
    zone_ids = sorted(active_zones.keys())
    n_zones = len(zone_ids)
    if n_zones == 0: return np.array([]), np.array([]), []

    from datetime import timedelta
    features = np.zeros((n_cycles, n_zones, 5))
    labels = np.zeros((n_cycles, n_zones), dtype=bool)

    for cycle in range(n_cycles):
        cs = t_min + timedelta(hours=cycle * cycle_hours)
        ce = cs + timedelta(hours=cycle_hours)
        for z_idx, zid in enumerate(zone_ids):
            zr = active_zones[zid]
            cycle_recs = [(t, r) for t, r in zr if cs <= t < ce]
            past_recs = [(t, r) for t, r in zr if t < cs]
            if cycle < n_cycles - 1:
                ns, ne = ce, ce + timedelta(hours=cycle_hours)
                labels[cycle, z_idx] = any(ns <= t < ne for t, _ in zr)

            if past_recs:
                hrs = (cs - past_recs[-1][0]).total_seconds() / 3600
                features[cycle, z_idx, 0] = max(0, 1 - hrs / 240)
            elif cycle_recs:
                features[cycle, z_idx, 0] = 0.8

            recent = len(cycle_recs) + len([r for r in past_recs if (cs - r[0]).total_seconds() < cycle_hours * 3 * 3600])
            features[cycle, z_idx, 1] = min(1.0, recent / 8)

            cats = [r["category"] for _, r in (cycle_recs + past_recs[-10:])]
            if cats:
                features[cycle, z_idx, 2] = Counter(cats).most_common(1)[0][1] / len(cats)
            features[cycle, z_idx, 3] = min(1.0, len(zr) / 20)
            hours = [t.hour for t, _ in (cycle_recs + past_recs[-10:])]
            if hours:
                features[cycle, z_idx, 4] = Counter(hours).most_common(1)[0][1] / len(hours)

    features = np.clip(features, 0, 1)
    print(f"[Chicago Transform] Features: {features.shape}, {n_zones} zones, {n_cycles} cycles")
    return features, labels, zone_ids

def generate_summary(records: List[Dict]) -> str:
    if not records: return "No records."
    cats = Counter(r["category"] for r in records)
    areas = Counter(r.get("borough", "Unknown") for r in records)
    zones = Counter(r["zone_id"] for r in records)
    lines = [
        "# Chicago 311 Dataset Summary", "",
        f"**Total records**: {len(records)}", f"**Unique zones**: {len(zones)}",
        "", "## Category Distribution", "",
        "| Category | Count | % |", "|---|---|---|",
    ]
    for cat, cnt in cats.most_common():
        lines.append(f"| {cat} | {cnt} | {cnt/len(records)*100:.1f}% |")
    lines += ["", f"**Active zones (≥3 reports)**: {sum(1 for c in zones.values() if c >= 3)}"]
    return "\n".join(lines)
