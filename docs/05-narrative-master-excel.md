# Product Narrative & Master Excel

Source: **`New Product Master_.xlsx`** → sheet **Primary**  
Columns: **Product Explanation**, **Formulae**, **Trade Amount**, **Listing**, **Principal Protection**, etc.

Parser: `lib/workbook/parser.ts`  
Display formatter: `lib/product-narrative-format.ts`  
UI: `components/dashboard/product-narrative.tsx`

---

## Excel ×100 percent convention

The master stores participation rates **multiplied by 100** in text:

| Excel text | Desk meaning | Formula token |
|------------|--------------|---------------|
| `7500%` | 75.0% participation | `(Z-32%)*7500%` → ×0.75 |
| `7600% (7500%+100%)` | 76.0% PR in band | PR display |
| `600%` upside decay | **6.0% per 1% index move** | `(35%-Z)*6` |
| `1633%+100%` | 16.3% + coupon component | `(Z-8%)*1633%` |
| `4850% coupon` | 48.5% coupon in band | narrative only |

**Rule:** For any **3+ digit** rate in prose, divide by 100 for desk display unless it is a **level** (e.g. 132% of initial = +32% move, not 1.32% participation).

---

## Formatter rules (`formatProductExplanation`)

Applied in `getProductOverview()` before UI render.

| Pattern | Output |
|---------|--------|
| `PR of 7600% (7500%+100%)` | `PR of 76.0% (75.0% participation + 100% coupon)` |
| `upside decay of 600%` | `upside decay of 6.0% per 1% index move (600% Excel participation)` |
| `600% participation` | `6.0% participation (for every 1% index move → 6.0% return)` |
| `coupon of 4850%` | `coupon of 48.5%` |
| `132% of Initial Nifty` | `132% of initial fixing (+32.0% index move)` |
| `from 109% to 111% of Initial Nifty` | `from 109% to 111% of initial fixing (+9.0% to +11.0% index move)` |
| Remaining `\d{4,}%` | Divided by 100 (catch-all) |

---

## Worked example — 600% upside decay

**Raw explanation (master):**

> For Final Nifty Levels above 135% … upside decay of **600%** till 140% … flat coupon of 30%

**Formula:**

```
… + MAX(-30%, MIN(0%, (35%-Z)*6)) …
```

**Verification (Z = index move as decimal):**

| Z | Index level | Return |
|---|-------------|--------|
| 0.35 | 135% | 60% |
| 0.36 | 136% | 54% (−6%) |
| 0.40 | 140% | 30% |
| 0.45 | 145% | 30% (flat) |

Each 1% above 135% shaves **6%** off return until −30% cap → **600% Excel = 6.0×**.

Automated check: `npm run verify:full` spot check **600% upside decay product**.

---

## Worked example — Nifty Accelerator 637 (INE093JA77C4)

| Excel | Desk |
|-------|------|
| PR of 7600% (7500%+100%) | 76.0% (75.0% participation + 100% coupon) |
| 132% to 133% of Initial | +32% to +33% index move band |

Formula: `… MAX(0%,(Z-32%)*7500%) …` at live Z ≈ +40% → flat 100% coupon.

---

## Product Overview placement

Rendered **inside** `RevealOutput` on:

- Payoff (`unified-payoff.tsx`)
- Valuation (`unified-valuation.tsx`)
- Product Details (`utility-pages.tsx`)

Never shows raw formula string — only formatted explanation + structure chips.

---

## After master Excel update

1. Add/replace `New Product Master_.xlsx` in repo root  
2. `npm run bake` — refreshes `lib/data/master-seed.json`  
3. `npm run verify:full` — all products narrative + formula QA  
4. Upload in app Home — live dataset refresh  

New products are picked up automatically if **Primary** row has **Name**, **Formulae**, **Product Explanation**.

---

## QA codes (full suite)

| Code | Meaning |
|------|---------|
| `NARRATIVE_FORMAT` | Unconverted 4850%, 7600%, etc. in formatted text |
| `NARRATIVE_FORMULA_MISMATCH` | e.g. text says 2150% but formula has 2000% — master data review |
| `FORMULA_EVAL` | Formula does not compile/evaluate |

See [03-testing-debug.md](03-testing-debug.md).
