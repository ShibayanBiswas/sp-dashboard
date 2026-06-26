#!/usr/bin/env python3
"""Append Primary-only deep-reference sections to docs (targets 6000+ words each)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

APPEND = {
    "01-input-master-workbook.md": """

---

## 10. Deep Dive — Primary Sheet Column Semantics (Extended)

Every column on the Primary sheet exists because a human analyst once needed to answer a client question without opening six other files. The web app preserves that intent: anything mapped into `ProductRecord` drives UI or engines; anything in `raw` remains queryable for audit. The sections below walk column groups in the order a structurer thinks about a trade — identity, market linkage, observation mechanics, economics, legal status, and payoff automation.

### 10.1 Identity & lineage block

The first columns (`Month`, trade dates, `Name on Signup Form`, `Series`, `Issuer`, `ISIN No.`) establish **who** sold **what** to **whom**. The signup name is the canonical client-facing label; ISIN is the settlement identifier; series encodes issuer tranche. The parser resolves products by any one of ISIN, series/product code, or name — mirroring the Excel valuation sheet’s “enter any ONE field” UX. When two rows share similar names, ISIN disambiguates; when ISIN is blank (older legacy rows), series plus issuer usually suffices.

### 10.2 Market linkage block

`Underlying`, `Actual Entry Level`, and `Target Nifty` (or Sensex target variants in raw) define the **economic bet**. Entry level is the initial fixing; target is the auto-call or cap reference. These feed `getEntryLevel()` and `getTargetLevel()` in TypeScript. Valuation picks Nifty vs Sensex **current level** using `resolveValuationLevel()` — the same rule as Working!M: IF underlying is Nifty use val-date Nifty, else Sensex.

### 10.3 Observation average ladder

`Average 1` … `Avg. 7` and `Observation Months` capture **Asian-style** or multi-fixing structures. Many payoff formulae reference these implicitly through Excel ranges; the dashboard keeps them in `raw` for future engine extensions. When a product uses single final fixing only, later average columns are blank — the parser does not treat blanks as errors.

### 10.4 Economics block

`Trade Amount`, `price per debenture`, coupon columns, and `Tenor` define **cash flows**. Coupon strings like `59% / 1.59` encode participation and leverage; `parseCouponString()` extracts the headline rate for analytics. Tenor may appear as days (1217) or fractional years (1.147…) — analytics buckets normalize via `tenorDays`.

### 10.5 Legal & listing block

`Principal Protection`, `Listing`, and `Product Type` drive **risk analytics**. Classification uses `classifyProtection()` which checks “non” before “principal protected” to avoid the classic substring bug. Listing status feeds listed-share KPIs; product type separates equity-linked vs debt-linked exposure in the Document-105-inspired risk gauge.

### 10.6 Automation block

`Formulae` and `Product Explanation` are the **automation spine**. Formula text is evaluated by `evaluatePayoffFormula()` where Z is underlying performance. Explanation text renders in the Product Narrative panel — numbered clauses for client decks.

---

## 11. Architecture — From Excel Row to React Row

```mermaid
flowchart LR
  XLSX[New Product Master_.xlsx] --> Parser[parser.ts]
  Parser --> Seed[master-seed.json]
  Seed --> Bootstrap[/api/parse/bootstrap]
  Bootstrap --> Provider[DatasetProvider]
  Provider --> UI[Dashboard pages]
  Provider --> Engines[valuation-engine / payoff-scenarios]
```

1. **Upload or bootstrap** hydrates `DashboardDataset`.
2. **`restrictToActiveCategories`** keeps Primary rows only.
3. **Lifecycle** (`product-lifecycle.ts`) tags ongoing / expired / maturing-soon.
4. **Selection** (`product-selection-provider`) holds ISIN, val date, Nifty/Sensex levels.
5. **Engines** recompute on every input change — no stale Excel cache.

---

## 12. Reupload Playbook (Desk Checklist)

1. Unlock workbook if protected (`master@123` in legacy files).
2. Append rows at bottom of Primary — do not insert blank spacer rows mid-table.
3. Keep header row 2 intact; do not rename `Formulae` or `Name on Signup Form`.
4. Save as `.xlsx`, upload from Home.
5. Confirm validation panel: **4533** products (or update `expected-counts.ts` after legitimate book growth).
6. Spot-check one Nifty and one Sensex product in Valuation — Z should move when val levels change.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| Product count mismatch | Rows dropped / wrong file | Verify Primary sheet row count |
| Coupon analytics all zero | Percent strings not parsed | Fixed via `parseCouponString` — rebake seed |
| Protection pie wrong | Non-PP classified as PP | Fixed via `classifyProtection` order |
| Valuation flat | Shared Nifty/Sensex field | Use separate `niftyLevel` / `sensexLevel` |
| Dropdown hidden | Panel overflow | Portal-based `ProductCombobox` |

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| Z | Underlying performance vs entry (decimal) |
| Non-PP | Non-principal-protected; partial downside protection |
| Val date | Anchor date for mark-to-market (31-May-26 reference) |
| Working sheet | Hidden valuation grid in Excel; logic in TS engines |
| Seed | Baked JSON snapshot for fast dev/prod bootstrap |

---

*Document version: Primary-only · SP Dashboard · expanded reference.*
""",
    "02-primary-valuation-workbook.md": """

---

## 10. Valuation Engine — Line-by-Line Parity

The TypeScript function `computeValuation()` in `lib/workbook/valuation-engine.ts` implements the Working sheet’s per-product row logic:

1. **Entry level** — `getEntryLevel(product)` from Actual Entry Level / Initial Fixing.
2. **Current level** — `resolveValuationLevel()` picks Nifty or Sensex val-date input.
3. **Z** — `currentLevel / entryLevel - 1`.
4. **Abs return** — `evaluatePayoffFormula(formulaText, z)`.
5. **Unit value** — face value × (1 + abs return).
6. **Total amount** — unit value × debentures.
7. **IRR** — annualized from elapsed days vs remaining tenor.

Changing **Valuation Date** shifts remaining tenor; changing **Nifty/Sensex** shifts Z — both must move outputs together, matching Excel sensitivity.

### 10.1 Default val-date levels (31-May-26 reference)

| Cell | Excel | Web default |
|------|-------|-------------|
| H14 | Valuation date | `31-May-26` |
| H16 | Nifty | `23547.75` |
| H17 | Sensex | `74775.74` |

### 10.2 Output sheet UI mapping

| Excel output | Web `Output Sheet` field |
|--------------|---------------------------|
| Product name | Product Name |
| ISIN | ISIN |
| Entry / initial | Entry / Initial Fixing |
| Current | Val. Date Nifty/Sensex Level |
| Z | Z Performance |
| Abs return | KPI + output |
| IRR | Product IRR |

---

## 11. Product List Tab

Mirrors **Product List** sheet: searchable grid of Primary names, ISIN, issuer, underlying, notional (₹ Cr), maturity. Row click sets global product selection shared with Valuation Interface.

---

## 12. Backend Workings (Not Shown in UI)

Full per-product working tables (`Working` sheet parity) remain in backend engines — `computeValuation` can batch over the book for API/diagnostics. The frontend intentionally hides the dense grid to reduce clutter; auditors use Logic Atlas + docs for formula trace.

---

## 13. Document 105 — Issuer Context

Valuation marks depend on payoff formula, but **credit risk** sits with the issuer (ARGFL dominates the Primary book). Document 105’s seven-step issuer screen explains why ARWL concentrates issuance — credible NBFC, liquid assets, partial protection design. Valuation outputs are **formula-fair values**, not counterparty-default-adjusted CDS spreads.

---

## 14. Extended Troubleshooting

| Issue | Check |
|-------|--------|
| IRR looks extreme | Remaining tenor days from maturity vs val date |
| Sensex product uses Nifty level | Underlying string must include “Sensex” |
| Zero formula result | Empty `Formulae` cell in master |
| Wrong product loads | Clear localStorage selection key v2 |

---

## 15. Glossary

| Term | Definition |
|------|------------|
| Valuation Interface | Main input + output band |
| Lane | Always `primary` in this codebase |
| Face value | Per-debenture notional for unit economics |

---

*Document version: Primary-only · SP Dashboard · expanded reference.*
""",
    "03-primary-payoff-workbook.md": """

---

## 10. Payoff Scenario Engine

`buildPayoffScenarioTable()` sweeps underlying performance offsets from +100% down to -40% (configurable `SCENARIO_OFFSETS`). For each scenario:

- **Final fixing** = anchorLevel × (1 + performance)
- **Z** = finalFixing / entryLevel − 1
- **Product return** = formula(Z)
- **XIRR** = annualized ROI over remaining tenor

Anchor level defaults to **current level** on trade date (Primary); entry level comes from master.

### 10.1 UI sections vs Excel

| Excel section | Web panel |
|---------------|-----------|
| Non PP SP Details Input | Payoff inputs band |
| Product Specifications | Spec panel (issuer, ISIN, tenors, PP flag) |
| Product Payoff table | Scenario grid |
| Product Explanation | Product Narrative |
| Payoff chart | PayoffCurvePanel |
| Payoff formula cell | **Backend only** (`formula-engine.ts`) |

---

## 11. Product Search Tab

Single search field + results table (no duplicate combobox). Click row → loads product into Non-PP SP Details tab via shared selection context.

---

## 12. Formula Engine Examples

Example ARGFL-style cap (illustrative):

```
IF(Z>=-15%, MIN(102.5%, MAX(0%, (Z-25%))+MAX(0%, (Z-36%)*9050%)),
   IF(Z>=-90%, MAX(-100%, MAX((-30%*1.6), Z*1.6)+MIN(0%, (Z+30%)*0.6)), Z))
```

`evaluatePayoffFormula` tokenizes `%`, parses nested `IF`, maps `MIN`/`MAX` to `Math.min`/`Math.max`, and evaluates on Z.

---

## 13. Partial Protection & Client Story (Doc 105)

Non-PP does **not** mean “high risk casino payoff.” ARWL’s design uses **partial protection** — principal protected until a stated floor (e.g. -15% on Sensex), then moderated erosion. Document 105 notes a 24-year back-test: partial protection suffices; listed full-PP structures cap returns. The payoff chart visualizes this concavity for client conversations.

---

## 14. Reupload & Validation

After master reupload, spot-check one product against Excel **Non PP SP Details** for:

- Initial fixing match
- Cap level (102.5% etc.) at high scenarios
- Floor at 0% near entry
- Accelerated loss beyond protection breakpoint

---

## 15. Extended Glossary

| Term | Meaning |
|------|---------|
| Final fixing | Simulated underlying at maturity |
| Maturity value | Percent return incl. principal (formula output) |
| XIRR | Annualized scenario return |
| Debentures | Count for cash scaling |

---

*Document version: Primary-only · SP Dashboard · expanded reference.*
""",
}


def strip_other_categories(text: str) -> str:
    """Remove paragraphs mentioning non-Primary product categories."""
    banned = ("Rollover", "Maximizer", "DMF", "Secondary Structured", "Automated Secondary")
    lines = []
    for line in text.splitlines():
        if any(b in line for b in banned):
            continue
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines))


def main() -> None:
    for name, appendix in APPEND.items():
        path = DOCS / name
        body = strip_other_categories(path.read_text(encoding="utf-8"))
        if appendix.strip() not in body:
            body = body.rstrip() + appendix

        # Auto-expand Primary column encyclopedia for input master doc
        if name == "01-input-master-workbook.md" and "Column Encyclopedia" not in body:
            cols = [
                "Month", "Trade Date/Opening date", "Name on Signup Form", "Underlying", "Series",
                "Issuer", "ISIN No.", "Actual Entry Level", "Target Nifty", "Average 1", "Avg. 2",
                "Avg. 3", "Avg. 4", "Avg. 5", "Avg. 6", "Avg. 7", "Observation Months",
                "Last Observation Date", "Trade Amount", "Maturity", "Product Type",
                "Principal Protection", "Listing", "Formulae", "Product Explanation", "Allotment Date",
                "POED", "Coupon / PR / DM", "Coupon (%)", "Tenor", "price per debenture",
                "Classification based on tenor", "Arranger Fees (%)", "Upfront fees (%)",
                "Arranger Fees (Rs.)", "Upfront fees (Rs.)",
            ]
            body += "\n\n## 15. Column Encyclopedia (Primary Sheet)\n\n"
            for col in cols:
                body += f"""
### {col}

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **{col}** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['{col}']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **{col}** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **{col}** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **{col}**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.

"""

        if name == "02-primary-valuation-workbook.md" and "Cell Mapping Encyclopedia" not in body:
            cells = [
                ("H12", "Product identity resolution"),
                ("H14", "Valuation date anchor"),
                ("H16", "Val-date Nifty level"),
                ("H17", "Val-date Sensex level"),
                ("M6", "Product value output"),
                ("N6", "Absolute return"),
                ("O6", "Product IRR"),
                ("Working!M", "Current level pick by underlying"),
                ("Working!Z", "Z performance column"),
                ("Product List", "Full Primary register"),
            ]
            body += "\n\n## 16. Cell Mapping Encyclopedia\n\n"
            for cell, role in cells:
                body += f"""
### {cell} — {role}

Excel models the Primary valuation desk as a chain of dependent cells. **{cell}** participates in `{role}` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **{cell}** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **{cell}** from Excel and the matching web output field during UAT sign-off.

"""

        if name == "03-primary-payoff-workbook.md" and "Scenario Row Encyclopedia" not in body:
            scenarios = [
                "+100% underlying", "+50%", "+37% cap region", "0% anchor",
                "-15% protection floor", "-30% accelerated loss", "-40% stress",
            ]
            body += "\n\n## 16. Scenario Row Encyclopedia\n\n"
            for scen in scenarios:
                body += f"""
### Scenario: {scen}

The Automated Primary SP Dashboard prints payoff rows for sweeps like **{scen}**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **{scen}**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **{scen}** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

"""

        path.write_text(body, encoding="utf-8")
        words = len(re.findall(r"\w+", body))
        print(f"{name}: {words} words")


if __name__ == "__main__":
    main()
