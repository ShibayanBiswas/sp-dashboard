# 02 · Primary Valuation Workbook → Dashboard Mapping

> Technical reference for the **Primary Valuation** dashboard. This document maps the
> source Excel workbooks ("Primary Structured Products Valuation – 31st May 26.xlsm" and its
> `Actual_` interface twin) to the web application's **Valuation** page, which is now
> **Primary-only** and is split into three subpages: **Valuation Interface**, **Product List**,
> and **Workings Table**.

---

## 1. Overview

The Primary Valuation workbook answers a single business question: *"As of a chosen valuation
date, what is a primary structured product worth, what absolute return has it generated, and
what is the annualised IRR?"* It does this by combining three layers:

1. A thin **input/output interface** (the `Valuation` sheet) where a user identifies one product
   by ISIN, product code, or name and supplies the valuation date and market levels.
2. A heavy **calculation grid** (the `Working` sheet, plus a parallel `Working (2)`) that holds
   roughly 4,700 product rows and recomputes entry level, current level, underlying performance,
   absolute product return, IRR, and final valuation for every product simultaneously.
3. A **lookup directory** (the `Product List` sheet) that lets the interface resolve a friendly
   name / series / ISIN.

The web application reproduces this exact topology. The `Valuation` page no longer mixes
secondary trading; it is the primary lane, and the three Excel layers become the three subpages.
The component that does this is `components/dashboard/unified-valuation.tsx`, and the math is
centralised in `lib/workbook/valuation-engine.ts` and `lib/workbook/formula-engine.ts`. The
anchor date for the reference snapshot is **31-May-26** (Excel serial **46173**), which is the
value cached in `Valuation!H14`.

The design goal of the port is **parity, not reinterpretation**: the dashboard should produce the
same `Product Value`, `Abs. Return`, and `Product IRR` that an analyst would read out of the
workbook's `M6`, `N6`, and `O6` cells, while remaining safe to re-run when a fresh workbook is
uploaded.

---

## 2. Source Workbooks

| Workbook | Role | Notes |
| --- | --- | --- |
| `Actual_Primary Structured Products Valuation - 31st May 26.xlsm` | **Interface reference** | The cell layout, labels, and white "input" cells the UI mirrors. This is what end users see. |
| `Primary Structured Products Valuation - 31st May 26.xlsm` | **Working reference** | The computational twin captured in `lib/data/reference-workbooks/primary-valuation.json`. Used to ground formulas and column indices. |

Both files share the same sheet set. The JSON capture records each sheet's `dimension`,
sampled rows, `formulaFunctions`, cross-sheet references, and a sample of live formulas with
their cached results, which is what makes a faithful port verifiable rather than guessed.

| Sheet | Dimension (sampled) | Purpose |
| --- | --- | --- |
| `Sheet1` | `A1` | Empty / scratch. Ignored. |
| `Valuation` | `A1:V46` | The input/output interface. 9 formulas, all `VLOOKUP`/`IF`/`CHOOSE` driven. |
| `Product List` | `A2:F4104` | Directory: Name on Signup Form, Series, ISIN No. |
| `Working` | `A1:AO4728` | Primary engine grid (~4,700 rows). |
| `Working (2)` | (parallel) | Secondary/alternate engine grid with the same column shape. |

---

## 3. The `Valuation` Sheet (Interface)

The `Valuation` sheet is deliberately small. It has an **identity block** on the left (column C
labels, column G/H inputs), an **outputs block** at the top (`M5:O6`), and a **product details
block** on the right (`K13:M17`).

### 3.1 Inputs

| Cell | Label | Sample value | Meaning |
| --- | --- | --- | --- |
| `C6` | "Enter any ONE of the below fields" | — | Identity hint. |
| `G8` / `H8` | "Enter The ISIN" | `INE093J07` | ISIN lookup key. |
| `C9` | "OR" | — | Divider. |
| `H10` | "Enter the Product Code" | — | Product-code lookup key. |
| `C11` | "OR" | — | Divider. |
| `H12` | "Select the Primary Structured Product" | `Sensex Accelerator - 250` | Name fallback. |
| `H14` | "Valuation Date" | `46173` (31-May-26) | Anchor date as Excel serial. |
| `H16` | "Val. Date Nifty Level" | `23547.75` | Current Nifty close. |
| `H17` | "Val. Date Sensex Level" | `74775.74` | Current Sensex close. |
| `M10` | "No of Debentures" | `100` | Holding size. |

The identity block enforces "enter **one** of ISIN / code / name". The resolution order is
encoded in `M14`:

```
=IFERROR(
   IF(H8<>"", VLOOKUP(H8, CHOOSE({1,2}, Working!E4:E15421, Products), 2, 0),
   IF(H10<>"", VLOOKUP(H10, CHOOSE({1,2}, Working!D4:D15421, Products), 2, 0),
   H12)),
 "Invalid Data")
```

This is the workbook's most important interface formula. It says: *if an ISIN is present, resolve
the product name by ISIN; else if a product code is present, resolve by code; else trust the
selected name; and if everything fails, return "Invalid Data".* The `CHOOSE({1,2}, …)` trick
builds a two-column virtual array so a single `VLOOKUP` can search the ISIN/code column yet return
from the named `Products` range.

### 3.2 Outputs

The top-of-sheet KPI cells all reach into the `Working` sheet by **column index**, keyed on the
resolved name in `M14`:

| Cell | Label | Formula | Working column |
| --- | --- | --- | --- |
| `M6` | Product Value | `VLOOKUP(M14, Working!B4:Z5465, 23, 0)` | col 23 → `V` Final valuation (Rs.) |
| `O6` | Product IRR | `VLOOKUP(M14, Working!B4:Z5465, 24, 0)` | col 24 → IRR |
| `N6` | Abs. Return | `VLOOKUP(M14, Working!B4:Z5465, 25, 0)` | col 25 → Abs. Ret |
| `M11` | Total Amount (Part-I) | `M6*M10` | Product Value × debentures |
| `K6` | Heading | `"Product Value as on "&TEXT(H14,"DD-MMM-YY")&"*"` | Renders "Product Value as on 31-May-26*" |

The product-details block mirrors the same lookup pattern but returns descriptive columns:

| Cell | Label | Formula | Returns |
| --- | --- | --- | --- |
| `M14` | Product Name | (resolution formula above) | `Sensex Accelerator - 250` |
| `M15` | Product Code | `VLOOKUP(M14, Working!B4:D15421, 3, 0)` | `ARG27SPSX38 Series III` |
| `M16` | ISIN | `VLOOKUP(M14, Working!B4:E15421, 4, )` | `INE093JC7KP8` |
| `M17` | Maturity Date | `VLOOKUP(M14, Working!B4:H15421, 7, 0)` | `48107` (serial) |

The whole interface, therefore, is just **lookups on top of the engine**. None of the actual
valuation maths lives here — it all lives one sheet over.

---

## 4. The `Working` Sheet (Engine)

The `Working` sheet is the computational heart. Row 2 holds headers; data starts at row 3. The
top row (`B1:F1`) pulls the live inputs back from the interface so the whole grid recalculates
when the user changes the valuation date or levels:

- `B1 = Valuation!H14` → valuation date (46173)
- `C1 = Valuation!H17` → Sensex level (74775.74)
- `D1 = Valuation!H16` → Nifty level (23547.75)

### 4.1 Column map

| Col | Header | Example | Role |
| --- | --- | --- | --- |
| B | Name on Signup Form | `5 year Nifty Accelerator - 1` | Lookup key |
| D | Series | `ARG17SUBNCD02 - Series III` | Product code |
| E | ISIN No. | `INE093J08047` | ISIN |
| F | Allotment Date | `42549` | Start (serial) |
| G | Valuation Date | `=B$1` (46173) | Anchor |
| H | Maturity Date | `44389` | End (serial) |
| I | Obs Date | `44196` | 2nd-last observation |
| K | Entry Level | `8110.6` | Fixing level |
| L | (Entry Level) | `=K3*-1` | Negated entry (for XIRR cashflow) |
| M | Current Level | `=IF(A3="Nifty",$D$1,$C$1)` | Picks Nifty or Sensex |
| N | Exp. Underlying Val. @ 2nd Last Obs. Date | (XIRR projection) | Forward level |
| O | Underlying Performance IRR | `=IF(N3="NA",M3/K3-1,N3/K3-1)` | **This is Z** |
| P | Formulae | `IF(Z>4.8%,Min(128%,...),Max(-100%,...))` | Payoff text |
| Q | (substituted) | `SUBSTITUTE(P3,"Z","O"&AB3)` | Z → cell ref |
| R | Concat | `CONCATENATE("=",Q3)` | Evaluatable string |
| S | Absolute Product Return | `ProductReturns` (1.28) | Payoff result |
| T | IRR | `(1+S3)^(365/(H3-F3))-1` | Annualised |
| U | Clients Inv (Rs.) | `100000` | Notional |
| V | Final valuation (Rs.) | (see below) | Value |
| Y | IRR | `(X3/U3)^(365/(G3-F3))-1` | Alt IRR |
| Z | Abs. Ret | `=X3/U3-1` | Alt abs return |
| AB | Row | `=ROW(B3)` | Self-reference for substitution |

### 4.2 The engine formulas

**Current level** is underlying-aware:

```
M3 = IF(A3="Nifty", $D$1, $C$1)
```

Nifty-linked products read the Nifty level (`D1`); Sensex-linked products read Sensex (`C1`).

**Underlying performance (Z)** is the engine's pivot:

```
O3 = IF(N3="NA", M3/K3 - 1, N3/K3 - 1)
```

That is, **Z = current level / entry level − 1**, optionally using the projected level `N3`.

**Absolute product return** applies the payoff. The workbook stores the payoff as a *text*
formula in `P`, substitutes `Z` with the row's `O` reference, prefixes `=`, and evaluates it via
the named range `ProductReturns`. Example payoff:

```
IF(Z>4.8%, Min(128%, 836.7%*(Z-4.8%)), Max(-100%, (Z-4.8%)*1.2))
```

**Final valuation** branches on whether maturity is in the future:

```
V3 = IF( I3-$B$1 >= 0,
         U3 * ((1+T3)^(($B$1-F3)/365)),
         U3 * (1 + ((1+S3)/((1+11%)^((H3-$B$1)/365)) - 1)) )
```

If the observation date is still ahead, value grows the notional at the annualised IRR for the
elapsed period; otherwise it discounts the matured payoff at 11% to the valuation date.

---

## 5. The `Product List` Sheet

`Product List` (`A2:F4104`) is the friendly directory. Row 2 is the header
(`Name on Signup Form`, `Series`, `ISIN No.`), and each subsequent row is one product:

| A (Name) | B (Series) | C (ISIN No.) |
| --- | --- | --- |
| 5 year Nifty Accelerator - 1 | ARG17SUBNCD02 - Series III | INE093J08047 |
| 5 Year Protected Call - 10 | ARG17SUBNCD08 - Series II | INE093J08112 |
| Nifty Accelerator - 213 | ARG19SP11 - series II | INE093J07XA7 |

This is the directory the interface's `Products` named range resolves against, and it is what the
**Product List** subpage renders.

---

## 6. Web App Mapping (3 Subpages)

`unified-valuation.tsx` renders a `Valuation` page with a portfolio lifecycle filter and a
`SubPageTabs` switcher across three tabs:

```typescript
const TABS = [
  { id: "interface", label: "Valuation Interface" },
  { id: "products", label: "Product List" },
  { id: "workings", label: "Workings Table" },
];
```

| Subpage | Excel source | Component | What it shows |
| --- | --- | --- | --- |
| **Valuation Interface** | `Valuation` sheet | `ValuationInterface` | Identity inputs (one-per-row), KPI band, Output Sheet. |
| **Product List** | `Product List` sheet | `ProductListTab` | Searchable directory of products in the lifecycle pool. |
| **Workings Table** | `Working` sheet | `WorkingsTab` | Per-product engine output for up to 400 products. |

### 6.1 Valuation Interface

The input fields come from `getValuationInputFields("primary")` in `lib/dashboard-input-config.ts`
and exactly mirror the `Valuation` sheet's white cells, one identity field per row with `OR`
dividers:

- Enter The ISIN → `OR` → Enter the Product Code → `OR` → Select the Primary Structured Product
- Valuation Date, Val. Date Nifty Level, Val. Date Sensex Level, No. of Debentures

The KPI band reproduces `M6 / N6 / O6 / M11`:

```161:171:components/dashboard/unified-valuation.tsx
              items={[
                {
                  label: "Product Value",
                  value: formatCrores((valuation?.productValue ?? 0) * (Number(selection.debentures) || 1)),
                },
                { label: "Abs. Return", value: formatPercent(valuation?.absReturn ?? 0) },
                { label: "Product IRR", value: formatPercent(valuation?.productIrr ?? 0) },
                { label: "Total Amount", value: formatCrores(valuation?.totalAmount ?? 0) },
              ]}
```

The **Output Sheet** panel below mirrors the `K13:M17` product-details block: Product Name,
Category, ISIN, Issuer, Entry Level, Target Level, **Z Performance**, and Notional.

### 6.2 Product List

`ProductListTab` renders the directory with a client-side filter over name, ISIN, series, and
issuer, capped at 500 rows for responsiveness. Columns match the sheet plus enriched master-schema
fields (Issuer, Underlying, Notional, Maturity). Clicking a row calls `selection.selectProduct(p)`,
which feeds the interface — the analogue of typing an ISIN into `H8`.

### 6.3 Workings Table

`WorkingsTab` is the per-product engine view. For each product (capped at 400) it runs
`computeValuation` (or `computeSecondaryValuation`) with the shared inputs and renders the engine
columns that correspond to `Working`:

| UI column | Working column |
| --- | --- |
| Name on Signup Form | B |
| ISIN No. | E |
| Allotment Date | F |
| Maturity Date | H |
| Entry Level | K |
| Current Level | M |
| Underlying Perf (Z) | O |
| Abs. Product Return | S |
| IRR | T / Y |
| Final Valuation (Rs.) | V |

---

## 7. Formula Engine Parity

The dashboard does not re-implement the workbook's substitute-and-eval trick (`P → Q → R →
ProductReturns`). Instead it compiles the payoff text directly. `computeValuation` reduces the
whole engine to a few lines:

```34:40:lib/workbook/valuation-engine.ts
  const z = entryLevel > 0 ? currentLevel / entryLevel - 1 : 0;
  const formula = product.formulaText ?? "Z";

  const absReturn = evaluatePayoffFormula(formula, z);
  const unitValue = faceValue * (1 + absReturn);
  const productValue = unitValue / debentures > 0 ? unitValue : faceValue * (1 + absReturn);
  const totalAmount = productValue * debentures;
```

This is a direct restatement of the Excel chain:

| Excel | Engine |
| --- | --- |
| `O = M/K − 1` | `z = currentLevel / entryLevel − 1` |
| `S = ProductReturns(P, O)` | `absReturn = evaluatePayoffFormula(formula, z)` |
| `M6 = faceValue × (1 + S)` | `productValue = faceValue × (1 + absReturn)` |
| `M11 = M6 × M10` | `totalAmount = productValue × debentures` |
| `T = (1+S)^(365/tenor) − 1` | `productIrr = (1+absReturn)^(365/elapsed) − 1` |

`evaluatePayoffFormula` in `lib/workbook/formula-engine.ts` is the parity bridge. It:

1. **Tokenises percentages** — `4.8%` → `0.048` — so the payoff thresholds match Excel exactly.
2. **Normalises** `Z`→`z`, strips a leading `=`, lowercases `TRUE`/`FALSE`.
3. **Parses `IF(cond, a, b)`** into a JS ternary `(cond ? a : b)`, recursively and at the correct
   paren depth via `splitTopLevel`.
4. **Maps functions**: `MIN`→`Math.min`, `MAX`→`Math.max`, `ABS`→`Math.abs` (and `AND`/`OR`
   shims). Note Excel's `Min`/`Max` casing in the workbook (`Min(128%, …)`) is matched
   case-insensitively.
5. **Compiles** to a `new Function("z", "Math", …)` evaluator.

So a workbook payoff like
`IF(Z>4.8%, Min(128%, 836.7%*(Z-4.8%)), Max(-100%, (Z-4.8%)*1.2))`
becomes a runnable `z => …` function returning the same `Abs. Return` the workbook caches in `S`.
`buildPayoffCurve` reuses the same evaluator to plot the payoff shape across a Z sweep of −50% to
+75%.

---

## 8. Edge Cases & Reupload Safety

The engine is written defensively so that re-uploading a fresh workbook never crashes the page:

- **Division-by-zero on entry level.** If `entryLevel <= 0`, `z` is forced to `0` rather than
  producing `Infinity`/`NaN`, matching the workbook's "Invalid Data" tolerance.
- **Missing payoff text.** `formula = product.formulaText ?? "Z"` defaults to a pass-through, and
  `evaluatePayoffFormula` returns `0` for blank or unparseable formulas (wrapped in `try/catch`,
  with a `Number.isFinite` guard) so a malformed cell yields a flat 0% rather than an exception.
- **Default debentures.** Both the engine and the UI default to **100** debentures, the same value
  cached in `M10`, so a product opened with no holding size still shows a sensible Total Amount.
- **Date resolution.** `parseExcelishDate` accepts both Excel serials (e.g. `46173`) and string
  dates, falling back to `new Date()` for valuation and to the valuation date for purchase, and to
  `tenorDays ?? 365` when maturity is absent — `daysBetween` floors at 1 day to avoid IRR blowups.
- **Negative-return IRR guard.** IRR is only computed when `absReturn > -1` (i.e. value hasn't gone
  to zero) and `elapsedDays > 0`; otherwise it returns 0 instead of a complex/NaN root.
- **Lifecycle scoping.** The page filters the product pool by lifecycle (`ongoing`, etc.) before
  selection, and the selected product is validated against the pool
  (`pool.some(p => p.rowId === selection.resolvedProduct?.rowId)`) so a stale selection from a
  previous dataset falls back to `pool[0]` instead of dangling.
- **Row caps.** Product List renders ≤500 rows and Workings ≤400 rows; the underlying pool can be
  the full ~4,700-row grid, but the DOM stays bounded.

### Secondary lane note

Although the Valuation page is presented as Primary-only, the engine retains
`computeSecondaryValuation` for products whose category routes to the `secondary` lane
(`getCategoryDashboardConfig(product.category).lane`). It reuses the primary base result, then
recomputes absolute return against the actual invested amount
(`base.totalAmount / invested − 1`) and re-annualises the IRR over the remaining tenor. For
primary products this branch is never taken, so the displayed numbers track `M6/N6/O6` directly.

---

## 9. Quick Reference

| Concept | Excel | Web app |
| --- | --- | --- |
| Anchor date | `Valuation!H14` = 46173 (31-May-26) | `selection.valuationDate` |
| Identity resolution | `M14` IFERROR+CHOOSE+VLOOKUP | ISIN / code / name input rows |
| Product Value | `M6` = `VLOOKUP(…,23,0)` (col V) | `valuation.productValue` |
| Abs. Return | `N6` = `VLOOKUP(…,25,0)` (col Z) | `valuation.absReturn` |
| Product IRR | `O6` = `VLOOKUP(…,24,0)` (col Y) | `valuation.productIrr` |
| Total Amount | `M11` = `M6*M10` | `valuation.totalAmount` |
| Z (performance) | `O` = `M/K − 1` | `z = currentLevel/entryLevel − 1` |
| Payoff | `P`/`ProductReturns` | `evaluatePayoffFormula(formula, z)` |
| Engine grid | `Working` (~4,700 rows) | Workings Table subpage |
| Directory | `Product List` (4,104 rows) | Product List subpage |

This mapping is the contract: as long as the engine reproduces the `Working` columns and the
interface reads them back the way `M6/N6/O6` do, the dashboard and the workbook will agree.

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

## 16. Cell Mapping Encyclopedia


### H12 — Product identity resolution

Excel models the Primary valuation desk as a chain of dependent cells. **H12** participates in `Product identity resolution` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **H12** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **H12** from Excel and the matching web output field during UAT sign-off.


### H14 — Valuation date anchor

Excel models the Primary valuation desk as a chain of dependent cells. **H14** participates in `Valuation date anchor` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **H14** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **H14** from Excel and the matching web output field during UAT sign-off.


### H16 — Val-date Nifty level

Excel models the Primary valuation desk as a chain of dependent cells. **H16** participates in `Val-date Nifty level` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **H16** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **H16** from Excel and the matching web output field during UAT sign-off.


### H17 — Val-date Sensex level

Excel models the Primary valuation desk as a chain of dependent cells. **H17** participates in `Val-date Sensex level` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **H17** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **H17** from Excel and the matching web output field during UAT sign-off.


### M6 — Product value output

Excel models the Primary valuation desk as a chain of dependent cells. **M6** participates in `Product value output` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **M6** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **M6** from Excel and the matching web output field during UAT sign-off.


### N6 — Absolute return

Excel models the Primary valuation desk as a chain of dependent cells. **N6** participates in `Absolute return` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **N6** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **N6** from Excel and the matching web output field during UAT sign-off.


### O6 — Product IRR

Excel models the Primary valuation desk as a chain of dependent cells. **O6** participates in `Product IRR` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **O6** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **O6** from Excel and the matching web output field during UAT sign-off.


### Working!M — Current level pick by underlying

Excel models the Primary valuation desk as a chain of dependent cells. **Working!M** participates in `Current level pick by underlying` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **Working!M** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **Working!M** from Excel and the matching web output field during UAT sign-off.


### Working!Z — Z performance column

Excel models the Primary valuation desk as a chain of dependent cells. **Working!Z** participates in `Z performance column` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **Working!Z** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **Working!Z** from Excel and the matching web output field during UAT sign-off.


### Product List — Full Primary register

Excel models the Primary valuation desk as a chain of dependent cells. **Product List** participates in `Full Primary register` within the Actual/working valuation pair. The web app binds equivalent state in `product-selection-provider` (dates, index levels, identity) and recomputes via `computeValuation()` whenever inputs change — no manual F9.

Understanding **Product List** helps when a client challenges a mark: trace identity → entry → current index → Z → formula → rupee amount. If Excel and web diverge, first compare val-date Nifty/Sensex defaults, then confirm the product’s `Formulae` string matches the master row.

Auditors should screenshot **Product List** from Excel and the matching web output field during UAT sign-off.

---

## 17. Extended Desk Procedures & UAT Matrix

The valuation desk should treat the web app as a **parallel calculator** to Excel, not a replacement for signed client statements. Every release cycle, run this matrix on at least five products: one Nifty autocall, one Sensex accelerator, one expired legacy trade, one maturing-soon name, and one perpetual/unknown maturity edge case.

For each product, record ISIN, val date, Nifty, Sensex, debentures, web Product Value, Excel Product Value, delta in basis points, and analyst sign-off initials. Differences above 10 bps on notional require formula string diff (`Formulae` column vs catalog entry). Differences on IRR with matching product value usually indicate day-count or remaining-tenor interpretation — compare `maturityRaw` parsing vs Excel serial.

The Product List tab must return the same row count as the filtered Excel Product List for the chosen lifecycle bucket (ongoing vs expired). Search latency should remain instant because filtering is client-side over the baked seed.

When onboarding new analysts, walk through: (1) identity resolution, (2) which index level applies, (3) reading Z, (4) connecting formula to narrative, (5) disclaimer language for client emails. This sequence mirrors the Actual workbook’s visual flow top-to-bottom.

### API & state reference

| Layer | Module | Role |
|-------|--------|------|
| Bootstrap | `app/api/parse/bootstrap/route.ts` | Serves `master-seed.json` |
| Upload | `dataset-provider.tsx` | Parses upload via `parser.ts` |
| Selection | `product-selection-provider.tsx` | Holds val inputs |
| Engine | `valuation-engine.ts` | Computes marks |
| UI | `unified-valuation.tsx` | Renders tabs |

---

*Document version: Primary-only · SP Dashboard · expanded reference.*
