#!/usr/bin/env python3
"""Remove legacy category column names from baked JSON artifacts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANNED = ("Rollover", "Maximizer", "DMF")


def scrub_seed() -> None:
    path = ROOT / "lib" / "data" / "master-seed.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    for product in data.get("products", []):
        raw = product.get("raw", {})
        for key in list(raw.keys()):
            if any(term in key for term in BANNED):
                del raw[key]
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Scrubbed {path.name}")


def scrub_valuation_ref() -> None:
    path = ROOT / "lib" / "data" / "reference-workbooks" / "primary-valuation.json"
    text = path.read_text(encoding="utf-8")
    for term in BANNED:
        text = text.replace(f'"{term}"', '"Primary"')
    path.write_text(text, encoding="utf-8")
    print(f"Scrubbed {path.name}")


if __name__ == "__main__":
    scrub_seed()
    scrub_valuation_ref()
