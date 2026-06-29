# Testing & Debug Guide

## Quick smoke test

```bash
npm run build
npm run dev
# open http://localhost:3000
```

1. **Home** — Portfolio by Lifecycle shows counts; timestamp updates each minute.
2. **Market** — Valuation inputs show today’s date + Nifty/Sensex (green “Live · Yahoo Finance” badge).
3. **Valuation** — Select Gearing Accelerator INE093JA7Q38 → Click reveal → Current Value ~₹198k on live levels.
4. **Payoff** — Nifty Accelerator INE093JA77C4 → Current Level read-only from Yahoo; Return @ move uses live Z (e.g. +40% at Nifty ~23,548 vs entry 16,800). Product Overview shows **76.0% (75.0% participation + 100% coupon)** not 7600%.
5. **Analytics / Home** — One lifecycle category panel at a time; switching Ongoing / Expiring 3M / 1M / Expired updates AUM, coupon, protection mix.
6. **Export** — “Export view” / “Full workbook” / per-page Download buttons produce `.xlsx`.

## API checks

```bash
curl http://localhost:3000/api/market/levels
```

Expect JSON: `{ valuationDate, niftyLevel, sensexLevel, source: "yahoo"|"fallback" }`.

## Valuation CLI check

```powershell
cd "SP Dashboard"
npx tsx -e "
import seed from './lib/data/master-seed.json';
import { computeValuation } from './lib/workbook/valuation-engine';
const p = seed.products.find(x => x.isin === 'INE093JA7Q38');
const v = computeValuation(p, { valuationDate: '31-May-26', currentLevel: 23547.75, debentures: 100 });
console.log({ pv: v.productValue, abs: (v.absReturn*100).toFixed(2), irr: (v.productIrr*100).toFixed(2) });
"
```

## Payoff pivot rows

- `findPayoffPivotZs(formula)` scans slope changes.
- `buildEnhancedPayoffScenarioTable()` merges Excel offsets + pivots + **current market-move row**.
- Table rows: `.pivot-row` (amber glow), `.current-row` (cyan ring).

## Lifecycle debug

| Filter | Rule |
|--------|------|
| Ongoing | Maturity > 90 days |
| Expiring 3M | 0–90 days |
| Expiring 1M | 0–30 days |
| Expired | Maturity < today |

Clock: `usePortfolioClock()` in `lifecycle-product-list.tsx`, `dashboard-shell.tsx`.

## localStorage

Key: `sp-dashboard-product-selection-v2`  
Persists: ISIN, product code, name, debentures — **not** valuation date/levels (always live).

## File map for bugs

| Symptom | Check |
|---------|-------|
| Wrong product value | `valuation-engine.ts`, `getClientInvestment()` |
| Wrong payoff % | `formula-engine.ts`, `payoff-pivots.ts` |
| Stale lifecycle counts | `product-lifecycle.ts`, `usePortfolioClock` |
| Stale index | `/api/market/levels`, `use-market-sync.ts`, `resolveLiveIndexLevel()` |
| 7600% / 7500% in narrative | `lib/product-narrative-format.ts` |
| Export empty | `export-products.ts`, filter pool size |
| Chart tooltip % on index | `payoff-underlying-chart.tsx` `dataKey === 'underlyingLevel'` |

## Seed refresh

```bash
npm run bake    # rebake master-seed.json from xlsx
npm run verify  # bake + product count checks
```

Reference workbooks are gitignored; place under repo root locally.
