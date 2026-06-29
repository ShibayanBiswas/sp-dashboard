# Valuation — Excel Working Sheet Parity

Reference: `Primary Structured Products Valuation - 31st May 26.xlsm` → sheet **Working**.

## Column mapping (web ↔ Excel)

| Excel | Meaning | Web field |
|-------|---------|-----------|
| **K** | Index entry (initial fixing) | `getIndexEntryLevel(product)` |
| **M** | Valuation-date index level | Nifty or Sensex input by underlying |
| **O** | Index performance | `M/K − 1` → `valuation.z` |
| **S** | Formula return | `evaluatePayoffFormula(formula, O)` → `formulaReturn` |
| **U** | Client investment (face) | `getClientInvestment()` — typically ₹1,00,000 |
| **V** | Final valuation (pre-cap) | `computeFinalValuation()` |
| **X** | Product value | `max(V, U)` → `productValue` |
| **G** | Valuation date | Live desk date (Yahoo sync) or user override |
| **F** | Allotment / trade date | Resolved from master |

## V branch (FINAL VALUATION)

```
IF last_obs_date >= val_date:
  rowIRR = (1 + S) ^ (365 / tenor_allot_to_maturity) − 1
  V = U × (1 + rowIRR) ^ (days_allot_to_val / 365)
ELSE:
  adjusted = (1 + S) / 1.11 ^ (days_val_to_maturity / 365) − 1
  V = U × (1 + adjusted)
```

Desk discount rate: **11%** (`DESK_DISCOUNT_RATE` in `valuation-engine.ts`).

## Outputs

| KPI | Formula |
|-----|---------|
| Current Value (X) | `round(max(V, U))` |
| Abs. Return | `X/U − 1` |
| Product IRR | `(X/U) ^ (365 / elapsed_days) − 1` |
| Total Amount | `X × debentures` |

## Index selection (M)

Same as Excel `IF(underlying="Nifty", niftyLevel, sensexLevel)` via `resolveValuationLevel()`.

## Live inputs

- **Valuation Date**: `formatDeskDate(new Date())` from market sync.
- **Nifty / Sensex**: Yahoo Finance last price (`^NSEI`, `^BSESN`).
- Fallback if Yahoo fails: last known desk defaults with **today’s date**.

## Expired products

`isValuationApplicable()` returns false when lifecycle is **expired** or **upcoming**. UI shows message; engine not called.

## Verification (Gearing Accelerator INE093JA7Q38)

@ 31-May-26, Nifty 23,547.75, face ₹1L:

- `productValue` ≈ **₹198,292**
- `absReturn` ≈ **98.3%**
- `productIrr` ≈ **14.5%**

Run: `npx tsx -e "..."`  (see README verify script).

## Common bugs fixed

| Issue | Cause | Fix |
|-------|-------|-----|
| Value = price × (1+return) | Used debenture price not face | `getClientInvestment()` uses face |
| IRR explosion | Purchase date as val date | IRR uses allotment → val elapsed |
| Wrong index | Single level field | Separate Nifty / Sensex |
| Decimals on X | Float noise | `Math.round` on rupees |
