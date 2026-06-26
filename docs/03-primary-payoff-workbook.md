# Primary Payoff Workbook → Web App

> **Quick guide:** See [04-full-codebase-audit.md](04-full-codebase-audit.md) for payoff scenario rules.  
> Below maps the Automated Primary SP Dashboard to `/payoff`.

---

## 1. Overview

The Primary Payoff workbook answers a single operational question: **"Given a primary
structured product and a hypothetical move in the underlying, what does the investor
receive at maturity, and what is the implied return and IRR?"** It does this by
resolving a product identity (ISIN, product code, or name), pulling its specification
row from the `Master` sheet, then sweeping the underlying's performance across a band
of scenarios (typically −50% to +50% and beyond) to produce a **scenario matrix** and a
**payoff chart**.

The web application reorganises this into a tightly scoped page. The legacy multi-lane
Payoff surfaces have been collapsed to a single **Primary** lane. A lifecycle filter
band (Ongoing / Matured / All) scopes the working product pool, and the two subpages
described above split the "compute a deal" workflow from the "find a product" workflow.
Crucially, the workbook's `Non-PP SP Details - Input` sheet, the `Non-PP SP Details`
output sheet, and the `Payoff Chart` are unified onto **one** subpage so the analyst
sees inputs and results without switching context — mirroring how the original
spreadsheet stacks input cells above the output block.

---

## 2. Source Workbooks

Two physical workbooks anchor this reference, both dated **31-May-26**:

| Workbook file | Role |
| --- | --- |
| `Actual_Automated Primary SP Dashboard - 31 May 26.xlsm` | Interface reference — the analyst-facing layout, formatting, and input cells |
| `Automated Primary SP Dashboard - 31 May 26.xlsm` | Working reference — the live formula/logic source captured in JSON |

The anchor date **31-May-26** matters for parity testing: cached formula values, tenor
calculations, and the Master row set are all snapshotted as of that date. When
regression-testing the web app's scenario output against the workbook, the comparison
must use a dataset reuploaded from the same vintage, otherwise tenor-driven IRR figures
will legitimately diverge.

The workbook contains the following sheets (per the captured reference):

| Sheet | Dimension | Purpose |
| --- | --- | --- |
| `Master` | `A1:Z4875` | Master product specification table |
| `Non-PP SP Details - Input` | `G3:N3696` | Single-product identity input (ISIN / code / name) |
| `Product Search` | `A2:D8052` | Flat searchable product list |
| `Non-PP SP Details` | `A4:AO237` | Specifications + payoff scenario matrix + chart |
| `Home` | `A1:U58` | Landing / navigation |
| `Combined Portfolio - Input` | — | Portfolio aggregation inputs |
| `Equity Portfolio Returns` | `B1:BB75` | "Returns at Various Market Levels on Maturity" |
| `Sheet1` / `Sheet2` / `Sheet7` | — | Internal helper/staging tables |

---

## 3. Master Sheet

The `Master` sheet (`A1:Z4875`) is the source of truth for every product the payoff
engine can price. Row 1 holds a numeric column index; **row 2 holds the headers**; data
begins at **row 3**. The header columns (B → V) are:

| Col | Header | Notes |
| --- | --- | --- |
| B | Trade Date | Excel serial (e.g. `41354`) |
| C | Name on Signup Form | Primary lookup key for the detail sheet |
| D | Underlying | e.g. Nifty, Sensex |
| E | Series | Product code / series identifier |
| F | Issuer | e.g. ARGFL |
| G | ISIN No. | e.g. `INE093J07221` |
| H | Entry Level | Initial fixing of the underlying |
| I | Target Level | Target/strike used by the payoff |
| J | Final Observation Dates | Comma-separated observation schedule |
| K | Initial Investment (Rs.) | Notional, used for face value |
| L | Maturity | Excel serial |
| M | Product Type | Equity / Debt |
| N | Principal Protection | Principal Protected / Non-PP |
| O | Listing | Listed / Unlisted |
| P | **Formulae** | The Excel payoff expression in `Z` |
| Q | Product Explanation | Human-readable payoff narrative |
| R | Allotment Date | Excel serial |
| S | Tenor | Total tenor (days) |
| T | Payoff tenor | Tenor used for IRR annualisation |
| U | Actual POED tenure | Put-option-exercise-driven tenor |
| V | Put Option Exercise Date | `NA` when not applicable |

The single most important column for the engine is **P (`Formulae`)** — for example
`IF(Z>0%,MIN(90%,Z*900%),Z)`, where `Z` is the underlying's performance expressed as a
decimal. This expression is what the web app's formula engine compiles and evaluates.
In the web schema (`lib/data/master-schema.json`) the equivalent record fields are
surfaced as `formulaText`, `Entry Level`, `Target Level`, `Initial Investment (Rs.)`,
`Face Value`, and `tenorDays`, accessed through helpers in `lib/product-utils.ts`
(`getEntryLevel`, `getTargetLevel`, `getFaceValue`).

---

## 4. Non-PP SP Details — Input

The `Non-PP SP Details - Input` sheet (`G3:N3696`) implements **identity resolution by
any one field**. The visible prompt cells are:

- `H8` — "Enter any ONE of the below fields"
- `H10` — "Enter The ISIN" (value typed into `M10`)
- `H12` — "Enter the Product Code" (value typed into `M12`)
- `H14` — "Select the Non-PP Structured Product" (dropdown into `M14`)

The resolution happens in `H3679`:

```text
IFERROR(
  IF(M10<>"", VLOOKUP(M10, CHOOSE({1,2}, Master!$G$3:$G$1048576, Prod), 2, 0),
  IF(M12<>"", VLOOKUP(M12, CHOOSE({1,2}, Master!$E$3:$E$1048576, Prod), 2, 0),
  M14)),
  "Invalid Data")
```

In words: prefer ISIN (`M10`) → else product code/series (`M12`) → else the dropdown
name (`M14`); if nothing resolves, return `"Invalid Data"`. The `CHOOSE({1,2}, …)`
trick builds a two-column virtual array so `VLOOKUP` can map an ISIN or code back to the
product name held in the `Prod` named range.

**Web mapping.** This is the **"Non-PP SP Details" input subpage**, rendered by
`ExcelInputPanel` in `mode="payoff"`. Instead of three identity fields, the web form
captures the secondary-deal inputs one per row — **Product Name**, **Current Level**,
**Purchase Date**, **No. of Debentures**, and **Price / Debenture** — and resolves the
product through `resolveProduct()` / the product selection context. Identity-by-any-one
field still applies: the `ProductCombobox` and the `Product Search` subpage both feed
the same selection state, and `resolveProduct` matches on ISIN, then series (product
code), then name, exactly mirroring the spreadsheet's precedence order.

---

## 5. Non-PP SP Details — Output (Scenario Matrix + Chart)

The `Non-PP SP Details` sheet (`A4:AO237`) is the output block. It opens by echoing the
resolved product name in `C4`:

```text
C4 = VLOOKUP('Non-PP SP Details - Input'!$H$3679, Master!$C$3:$Q$9874, 1, 0)
```

It is then divided into three labelled regions (row 6): **`C6` Product Specifications**,
**`F6` Product Payoff**, and **`K6` Payoff Chart**.

**Product Specifications (C8:D23).** A vertical list of `VLOOKUP`s against `Master`
keyed on `H3679`: Issuer, ISIN, Product Code, Trade Date, Allotment Date, Underlying,
Initial Fixing, Target Level, Final Obs Date, Put Option Exercise Date, Redemption
Date, PP/Non-PP, Listed/Unlisted, Payoff Tenor (Days) in `D22`, and Tenor (Days) in
`D23`. `D14` (Initial Fixing) and `D22` (Payoff Tenor) are the two cells the scenario
math depends on.

**Product Payoff matrix (F8:I…).** The headers are `F8` Final Fixing, `G8` Underlying's
Performance, `H8` Product Returns, `I8` XIRR. Each row sweeps a performance level `G`:

| Cell | Formula | Meaning |
| --- | --- | --- |
| `F10` | `$D$14*(1+G10)` | Final fixing = initial fixing × (1 + performance) |
| `G10..` | literal (`1`, `0.7`, `0.5`, `0.4`, … `0`, `-0.1`, `-0.15`, `-0.2` …) | Underlying performance grid |
| `H10` | `ProductReturn` (named) | Payoff applied to the row's performance |
| `I10` | `((1+H10)^(365/$D$22))-1` | Annualised return (XIRR proxy) |

The payoff itself is driven by the named **`Formulae`** cell `Y8` (e.g.
`IF(Z>=-15%,MIN(102.5%,MAX(0%,(Z-25%))+MAX(0%,(Z-36%)*9050%)),IF(Z>=-90%,MAX(-100%,MAX((-30%*1.6),Z*1.6)+MIN(0%,(Z+30%)*0.6)),Z))`).
Each row materialises the formula by substituting its `G` value via
`Y10 = SUBSTITUTE($Y$8,"Z",G10)` and concatenating a leading `=` in `Z10`. This is the
spreadsheet's way of evaluating the same `Z`-formula at many performance points — which
the web app replaces with a compiled JavaScript evaluator.

**Payoff Chart (K6 region).** A line chart of product return vs. underlying
performance. It is the visual twin of the web app's payoff curve and of the
`Equity Portfolio Returns` sheet's "Returns at Various Market Levels on Maturity (Rs.)"
grid, which fixes discrete buckets (Up By 50/40/20/10%, Flat 0%, Down By 5/10/20%) off
an "Enter Nifty" cell (`C5`).

**Web mapping.** This entire sheet renders **below the input** on the same subpage:

- **KPI band** — Entry Level, Target Level, Scenario Return, Scenario IRR (the
  `anchor`/0% row drives the scenario KPIs).
- **`ProductNarrative`** — the Master `Product Explanation` text.
- **`PayoffCurvePanel`** — the payoff chart (see §6).
- **Scenario output `DataTable`** — columns Performance, Final Fixing, Z, Maturity
  Value, Return, IRR, produced by `buildPayoffScenarioTable`.

---

## 6. Payoff Chart / Payoff Curve

`components/dashboard/payoff-curve.tsx` simply re-exports
`PayoffUnderlyingChart` (from `components/charts/payoff-underlying-chart.tsx`) as
`PayoffCurvePanel`. The chart is a Recharts `ComposedChart` with two series on dual
axes:

- **Payoff** (area, left axis) — `evaluatePayoffFormula(formula, z)` across the curve.
- **Underlying level** (line, right axis) — `entryLevel * (1 + z)`, the analogue of the
  workbook's `Final Fixing` column.

The curve points come from `buildPayoffCurve(formula, 41)` in the formula engine, which
sweeps `z` from **−0.5 to +0.75** over 41 evenly spaced points
(`z = -0.5 + (index / 40) * 1.25`). A live **Nifty performance (Z)** input lets the
analyst probe a single point, displaying the resulting underlying level and product
payoff — the interactive equivalent of changing a `G`-column cell in the spreadsheet.

---

## 7. Product Search

The `Product Search` sheet (`A2:D8052`) is a flat catalogue. `A2` carries the title
"Product Search for Debentures Details Inputs"; row 4 holds the headers **Trade Date**,
**Name on Signup Form**, **ISIN**, **Series**; data begins at row 5. It is a denormalised
projection of `Master` intended purely for lookup/selection.

**Web mapping.** This is the **"Product Search" subpage** (`ProductSearchTab`). It
provides a `ProductCombobox` (the "Debentures Details Input" selector) plus a free-text
search box that filters on name, ISIN, series, issuer, and underlying. Results render in
a `DataTable` with columns Name on Signup Form, Series, ISIN No., Underlying, Entry
Level, Maturity. Clicking a row sets the shared product selection, which immediately
re-drives the Non-PP SP Details subpage. The list is capped at 500 visible rows for
render performance while reporting the full filtered count.

---

## 8. Web App Mapping (Subpages)

`UnifiedPayoffDashboard` (`components/dashboard/unified-payoff.tsx`) is the page shell.
The complete Excel-to-web mapping:

| Excel artefact | Web surface |
| --- | --- |
| `Non-PP SP Details - Input` sheet | "Non-PP SP Details" input subpage (`ExcelInputPanel`, `mode="payoff"`) |
| `Non-PP SP Details` sheet (specs + matrix + chart) | Output rendered **below** the input on the same subpage |
| `Product Search` sheet | "Product Search" subpage (combobox + search table) |
| `Master!Formulae` (col P) | `product.formulaText` → formula engine |
| Payoff Chart / Equity Portfolio Returns grid | `PayoffCurvePanel` payoff + underlying curve |

The page also adds a **lifecycle filter** (Ongoing / Matured / All) via
`filterProductsByLifecycle`, scoping which products are eligible. The selected product
falls back to the first product in the pool if the current selection is filtered out, so
the output panel is never empty when products exist.

---

## 9. Scenario Engine & Formula Parity

`buildPayoffScenarioTable` (`lib/workbook/payoff-scenarios.ts`) reproduces the
spreadsheet's `F/G/H/I` matrix. The performance grid is fixed:

```text
SCENARIO_OFFSETS = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.5, 0.75, 1]
```

For each offset it computes, row by row:

| Field | Computation | Excel analogue |
| --- | --- | --- |
| `finalFixing` | `anchorLevel * (1 + performance)` | `F = $D$14*(1+G)` |
| `z` | `entryLevel > 0 ? finalFixing/entryLevel - 1 : performance` | normalises move to entry |
| `maturityValue` | `evaluatePayoffFormula(formula, z)` | `ProductReturn` / `Y`-substitution |
| `maturityAmount` | `(1 + maturityValue) * debentures * faceValue` | redemption value |
| `returnOnInvestment` | `maturityAmount/investment - 1` | total return |
| `irr` | `(1 + roi)^(365/remainingTenorDays) - 1` | `I = ((1+H)^(365/$D$22))-1` |

categories (`usesInitialFixingAsCurrentLevel`), the anchor is the entry level; otherwise
it is the analyst-supplied `currentLevel`, falling back to entry level. `investment`
defaults to `debentures × pricePerDebenture` (price defaulting to face value), and
`remainingTenorDays` defaults to `product.tenorDays` (then `365`).

**Formula parity** is handled by `evaluatePayoffFormula` in
`lib/workbook/formula-engine.ts`. It normalises an Excel expression into evaluable
JavaScript:

- `tokenizePercentages` rewrites `6%` → `0.06`.
- `Z` → `z`; `TRUE/FALSE` → `true/false`; a leading `=` is stripped.
- `parseIf` recursively rewrites `IF(cond, a, b)` → `(cond ? a : b)`.
- `replaceFunctions` maps `MIN/MAX/ABS` → `Math.min/max/abs`, and `AND/OR` → array
  `every([…])`/`some([…])` forms.
- The result is compiled via `new Function("z", "Math", …)` and evaluated; non-finite
  results and parse failures both fall back to `0`.

This guarantees that a Master `Formulae` cell such as
`IF(Z>=6%,47.5%,MAX(-100%,47.5%+(Z-6%)*2.55))` yields the same payoff in the web app as
the spreadsheet's `Y`-substitution mechanism, for any `z`.

---

## 10. Payoff Steps (from `getPayoffSteps`)

`getPayoffSteps(category)` in `lib/dashboard-input-config.ts` codifies the analyst
workflow shown beside the input form:

1. **Set deal parameters** — Product Name (dropdown / product list); Current Level
   Price / debenture (deal price from the team).
   Level and remaining tenor recalculates from purchase date to maturity; for all
   others, Current Level is the closing underlying level on the trade date.
3. **Scenario sweep** — underlying performance (Z) levels are editable (except the 0%
   anchor); review maturity value, return on investment, and IRR per scenario row.

Supporting constants include `INPUT_HINT` ("Highlighted cells are for inputs"),
`IDENTITY_HINT` ("Enter any ONE of the below fields", matching `H8`), and
`DEBENTURE_PRESETS` (`1, 10, 25, 50, 100, 250, 500, 1000`).

---

## 11. Edge Cases & Reupload Safety

- **Missing formula.** Products without `formulaText` produce an empty scenario table
  (`scenarios = []`) and the payoff curve panel is hidden; the KPI band still renders
  with zeroed scenario return/IRR. `evaluatePayoffFormula` returns `0` for blank or
  unparsable formulas rather than throwing.
- **Zero / missing entry level.** `getEntryLevel` falls back through Entry Level →
  Initial Level → Initial Fixing Level → price per debenture → `10000`, so `z`
  normalisation never divides by zero; when `entryLevel <= 0`, `z` falls back to the raw
  performance offset.
- **Zero investment or tenor.** `returnOnInvestment` falls back to `maturityValue` when
  `investment <= 0`; `irr` is `0` when `remainingTenorDays <= 0` or the return is
  `≤ -100%`, preventing `NaN`/complex-root artefacts.
- **Identity precedence.** ISIN → product code (series) → name, identical to the
  workbook's `H3679`. An unmatched identity falls back to the first product in the
  lifecycle pool rather than an "Invalid Data" dead end.
- **Reupload safety.** The reference JSON is keyed to the **31-May-26** anchor. When a
  fresh Master is uploaded, parity holds as long as the header row (row 2) names are
  preserved, because the web app reads by header name through `rawField`, not by column
  index. Tenor-driven IRR figures will shift with the dataset vintage by design — always
  compare against a workbook of the same date when validating.
- **Lifecycle filtering.** Selecting "Matured" can empty the pool; the UI then shows
  "No products in this lifecycle bucket." instead of rendering a stale product.
- **Large lists.** The Product Search table renders at most 500 rows but reports the full
  match count, keeping the `A2:D8052`-scale catalogue responsive.

---

### Related references

- `lib/data/reference-workbooks/automated-primary-dashboard.json` — full sheet samples and formulas.
- `lib/data/master-schema.json` — web app master schema and category columns.
- `lib/workbook/payoff-scenarios.ts`, `lib/workbook/formula-engine.ts` — scenario + formula logic.
- `components/dashboard/unified-payoff.tsx`, `components/charts/payoff-underlying-chart.tsx` — UI.
- `lib/dashboard-input-config.ts` — payoff steps and input field configuration.

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

## 16. Scenario Row Encyclopedia

### Scenario: +100% underlying

The Automated Primary SP Dashboard prints payoff rows for sweeps like **+100% underlying**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **+100% underlying**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **+100% underlying** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: +50%

The Automated Primary SP Dashboard prints payoff rows for sweeps like **+50%**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **+50%**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **+50%** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: +37% cap region

The Automated Primary SP Dashboard prints payoff rows for sweeps like **+37% cap region**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **+37% cap region**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **+37% cap region** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: 0% anchor

The Automated Primary SP Dashboard prints payoff rows for sweeps like **0% anchor**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **0% anchor**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **0% anchor** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: -15% protection floor

The Automated Primary SP Dashboard prints payoff rows for sweeps like **-15% protection floor**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **-15% protection floor**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **-15% protection floor** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: -30% accelerated loss

The Automated Primary SP Dashboard prints payoff rows for sweeps like **-30% accelerated loss**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **-30% accelerated loss**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **-30% accelerated loss** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

### Scenario: -40% stress

The Automated Primary SP Dashboard prints payoff rows for sweeps like **-40% stress**. Each row shows Final Fixing, Underlying Performance, Product Returns, and XIRR. The web `buildPayoffScenarioTable()` reproduces this grid using the same Z → formula pipeline as valuation, but anchored on forward final fixing rather than mark-to-market date.

For **-40% stress**, compare Excel row shading (0% anchor, cap rows) with the highlighted row in the web Product Payoff table. Maturity value is expressed as percent return on principal; multiply by face value × debentures for rupee maturity proceeds.

Client decks should cite **-40% stress** alongside the narrative panel so non-quants grasp upside cap and downside floor in plain language.

---

## 17. Extended Payoff Desk Procedures

Primary payoff analysis supports client conversations about **what happens at maturity** under different market levels. The desk workflow: select product → confirm specifications panel matches contract → enter deal inputs (current level, purchase date, debentures, price) → read scenario table → show chart in meeting.

Cap rows (often near +37% to +100% performance) should flatline at coupon cap — if the web table slopes upward through the cap band, the formula string may have been edited in master without updating the catalog. Floor rows near entry should show 0% return until the protection breakpoint; below that, returns should deteriorate faster than the underlying (leverage on downside).

Product Search tab is intentionally minimal: one search box, one table, no nested combobox duplication. Results highlight the active ISIN row with a cyan ring.

Formula text never renders in the UI — clients see explanation prose and numeric scenarios only. Engineers trace formulas via Logic Atlas and `logic-registry.ts`.

### Payoff parity checklist

| Step | Excel | Web |
|------|-------|-----|
| Identity | Non PP SP Details Input | ExcelInputPanel |
| Specs | Left column labels | ProductSpecifications |
| Scenarios | Product Payoff grid | Product Payoff table |
| Chart | Embedded graph | PayoffCurvePanel |
| Formula | Hidden cell | `formula-engine.ts` |

---

## 17. Payoff Curve Interpretation Guide

Read the chart in four zones: deep loss (floor/acceleration), anchor near 0%, participation slope, cap flattening. Rupee proceeds = `(1 + maturityReturn%) × face × debentures`.

---

## 18. Product Specifications Panel

Mirrors Excel header block — ISIN, issuer, underlying, fixings, tenor, protection, listing — with Indian number grouping on index fields.

---

## 19. Extended Scenario ↔ Excel Row Map

| Offset | Client talking point |
|--------|----------------------|
| +100% | Bull / cap test |
| 0% | Unchanged market |
| −15% | Partial protection floor |
| −40% | Stress tail for risk committee |

---

## 20. Rupee Formatting on Payoff Surfaces

Fixings: `formatNumber`. Returns/XIRR: `formatPercent`. Chart tooltips match Analytics Lab — no scientific notation.

---

*Document version: Primary-only · SP Dashboard · expanded reference.*