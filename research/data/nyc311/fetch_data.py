"""
NHS Research — NYC 311 Real Data Fetcher
=========================================
Downloads sanitation-related complaints from NYC Open Data (Socrata SODA API).
Public data, no API key required for <50K records.

Source: https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9
License: NYC Open Data Terms of Use (public domain)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


def fetch_nyc311(config: dict, output_path: Path = None) -> List[Dict[str, Any]]:
    """
    Fetch sanitation complaints from NYC 311 Open Data.
    Returns list of raw records.
    """
    if not HAS_REQUESTS:
        print("[NYC311] requests library not installed. Skipping fetch.")
        return []

    nyc = config.get("nyc311", {})
    base_url = nyc.get("base_url", "https://data.cityofnewyork.us/resource/erm2-nwe9.json")
    limit = nyc.get("limit", 10000)
    min_date = nyc.get("min_date", "2024-06-01")
    complaint_types = nyc.get("complaint_types", [
        "Dirty Condition",
        "Illegal Dumping",
        "Sanitation Condition",
        "Overflowing Litter Baskets",
    ])

    # Build Socrata SoQL query
    type_filter = " OR ".join([f"complaint_type='{ct}'" for ct in complaint_types])
    where = f"({type_filter}) AND latitude IS NOT NULL AND created_date >= '{min_date}T00:00:00'"

    params = {
        "$select": "complaint_type,descriptor,latitude,longitude,created_date,borough,status",
        "$where": where,
        "$order": "created_date DESC",
        "$limit": str(limit),
    }

    print(f"[NYC311] Fetching up to {limit} records from NYC Open Data...")
    print(f"[NYC311] Filter: {', '.join(complaint_types)}")
    print(f"[NYC311] Since: {min_date}")

    try:
        resp = requests.get(base_url, params=params, timeout=60)
        resp.raise_for_status()
        records = resp.json()
    except Exception as e:
        print(f"[NYC311] ERROR: {e}")
        return []

    print(f"[NYC311] Fetched {len(records)} records")

    # Save raw data
    if output_path is None:
        output_path = Path(__file__).resolve().parent / "nyc311_raw.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(records, f, indent=2)
    print(f"[NYC311] Saved raw data to {output_path}")

    return records


if __name__ == "__main__":
    import yaml
    config_path = Path(__file__).resolve().parent.parent.parent / "config.yaml"
    with open(config_path) as f:
        config = yaml.safe_load(f)
    fetch_nyc311(config)
