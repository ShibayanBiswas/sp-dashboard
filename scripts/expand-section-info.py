#!/usr/bin/env python3
"""Expand SECTION_INFO entries from 2 to 4 paragraphs."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "lib" / "section-info.ts"

EXTRA: dict[str, list[str]] = {
    "home-kpis": [
        "All rupee figures use Indian accounting notation — commas in lakhs/crores style and the ₹ symbol — so they match how the desk reads client statements.",
        "If you upload a fresh master workbook, these tiles refresh instantly; they always reflect the Primary sheet only, with no legacy category lanes mixed in.",
    ],
    "home-filter": [
        "The default view is the live book (ongoing products), which is what relationship managers usually need on a Monday morning check-in.",
        "Switching filters does not change your selected product in Valuation or Payoff — it only changes which universe you browse on this page.",
    ],
    "home-maturity": [
        "Hover any bar to see the exact notional in ₹ Crores with full comma grouping; the Y-axis uses the same Indian number format so nothing is rounded away silently.",
        "Products without a parseable maturity date land in the “Unknown” bucket so their money is still counted rather than dropped from the chart.",
    ],
    "home-modules": [
        "Each module opens the same engine that powers the Excel workbooks — valuation uses the Primary Valuation file logic; payoff mirrors the Automated Primary dashboard.",
        "Use Portfolio when you need a spreadsheet-style register; use Logic Atlas when you want to audit how a formula or pipeline stage is wired in code.",
    ],
    "val-filter": [
        "Only Primary-category products appear here. The lifecycle filter matches the home page so you can value the live book or audit expired trades consistently.",
        "Uploading a new master from Home automatically refreshes the product list shown in Valuation — no separate import step.",
    ],
    "val-inputs": [
        "Nifty and Sensex levels are stored separately: when the underlying is Nifty the engine uses your Nifty field, and when it is Sensex it uses Sensex — they no longer overwrite each other.",
        "Debenture count scales per-client holdings; Product Value and Total Amount in the output panel multiply face economics by that count, exactly like the Excel output block.",
    ],
    "val-output": [
        "Every headline number is shown with ₹ and Indian comma grouping where applicable, so you can paste values into client emails without reformatting.",
        "The underlying index level on the valuation date is displayed beside Z Performance so you can verify the market input that drove the result.",
    ],
    "val-products": [
        "Trade amounts in the table are in ₹ Crores with commas; click a row once to push that ISIN into the valuation interface above.",
        "The search box filters on name, ISIN, series, issuer, or underlying — the same keys the Excel sheet accepts in its lookup cells.",
    ],
    "val-workings": [
        "This backend view is retained for audit parity with Excel even when hidden from the default UI; API routes still expose the same working rows.",
        "Each row recomputes when global Nifty/Sensex or valuation date changes, so batch checks stay in sync with single-product mode.",
    ],
    "pay-filter": [
        "Payoff is forward-looking only — it does not mix expired lifecycle states unless you explicitly widen the filter to include them.",
        "The page shares product selection with Valuation via the global context, so picking a product on Home carries through if you navigate here next.",
    ],
    "pay-inputs": [
        "Price per debenture and count drive invested capital; the scenario engine uses the product’s stored formula text to compute maturity proceeds at each market level.",
        "Current underlying level should match the trade-date or observation fixing you intend to stress — the graph recentres when you change it.",
    ],
    "pay-output": [
        "The Product Payoff table columns mirror Excel: Final Fixing, Performance (Z), Maturity value, Returns, and XIRR — all percentages and rupees formatted for Indian readers.",
        "The chart plots maturity value (%) against underlying performance so cap, floor, and participation kinks are visible without reading every table row.",
    ],
    "pay-search": [
        "Results respect the lifecycle filter from the top of the page, keeping expired and live books separate during client meetings.",
        "Double-check ISIN in the specs panel after selection — it is the settlement key when two product names look similar.",
    ],
    "an-lifecycle": [
        "Legend entries show product count and notional in ₹ Crores with commas, so slice size and count are both visible at a glance.",
        "Maturing-soon is split from ongoing so ninety-day pipeline risk is not buried inside the general live bucket.",
    ],
    "an-coupon": [
        "Coupon rates are parsed from strings like “49.0%” in the master sheet; blank or zero coupons roll into the “No coupon” bucket rather than distorting averages.",
        "Bar heights are weighted by trade amount, not product count — a few large tickets dominate the chart, which matches economic exposure.",
    ],
    "an-protection": [
        "Classification checks “non” before “principal protected” so Non-Principal Protected rows never mis-tag as protected — a common Excel substring trap we fixed in code.",
        "Unclassified notionals appear only when the master cell is blank; they are coloured neutral grey so you can spot data gaps quickly.",
    ],
    "an-underlying": [
        "The horizontal layout keeps long index names readable; the X-axis uses the same ₹ Crore / Lac formatter as the maturity ladder.",
        "Top ten underlyings by notional are shown; tail names are grouped implicitly by sorting so the chart stays legible on wide screens.",
    ],
    "an-tenor": [
        "Tenor comes from master `Tenor` days when present; unknown tenors still contribute notional to the Unknown bucket instead of being excluded.",
        "Short tenor concentration implies reinvestment risk; long tenor concentration implies duration — read the chart as a liquidity and timing profile.",
    ],
    "an-radar": [
        "Risk scores follow Document 105–style credit weighting: issuer credibility, partial protection, tenor, and market linkage — structured products score lower than vanilla equity by design.",
        "Gauges show credible-issuer share, listed share, and average tenor in years beneath the needle so the single risk number is never taken out of context.",
    ],
}


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    for key, extras in EXTRA.items():
        pattern = rf'("{re.escape(key)}": \{{\s*title: "[^"]+",\s*paragraphs: \[\s*)(.*?)(\s*\],\s*\}})'
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            print(f"skip {key}")
            continue
        body = match.group(2)
        existing = re.findall(r'"((?:\\.|[^"\\])*)"', body)
        if len(existing) >= 4:
            continue
        indent = "      "
        new_paras = existing + extras[: 4 - len(existing)]
        joined = ",\n".join(f'{indent}"{p}"' for p in new_paras)
        replacement = f"{match.group(1)}\n{joined},\n    {match.group(3).lstrip()}"
        text = text[: match.start()] + replacement + text[match.end() :]
        print(f"expanded {key} -> {len(new_paras)} paragraphs")
    text = text.replace(
        "Each entry has at least two short paragraphs",
        "Each entry has four short paragraphs",
    )
    TARGET.write_text(text, encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
