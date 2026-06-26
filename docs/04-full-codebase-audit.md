# SP Dashboard — How It Works (Jun 2026)

Primary-only structured products desk. Upload `New Product Master_.xlsx` → app loads **Primary** rows → valuation and payoff run from each row’s **Formulae** column and master fields.

---

## Data flow

1. **Upload** or baked seed (`lib/data/master-seed.json`) → `ProductRecord[]`
2. **Valuation** — `lib/workbook/valuation-engine.ts` + `formula-engine.ts`
3. **Payoff** — `lib/workbook/payoff-scenarios.ts` + same formula engine
4. **Analytics** — `lib/analytics.ts` aggregates notional, lifecycle, coupons

Re-upload a new master anytime; formulas and levels come from the file, not hardcoded defaults.

---

## Valuation

**Inputs:** ISIN / code / name, valuation date, Nifty level, Sensex level, debentures.

**Client investment (U):** Face value — typically **₹1,00,000** even when price/debenture is ₹1,25,000.

**Core math (Working sheet):**

| Step | Rule |
|------|------|
| Entry (K) | Actual Entry Level from master |
| Current (M) | Val-date Nifty or Sensex |
| Performance O | M ÷ K − 1 |
| Formula return S | Formulae column at O |
| Final val V | Discount branch when last obs &lt; val date (11% p.a. to maturity) |
| Product Value X | max(V, U) |
| Abs. return | X ÷ U − 1 |
| IRR | (X ÷ U)^(365 ÷ days since trade) − 1 |

**UI:** `/valuation` — Valuation Interface + Product List.

---

## Payoff

**Inputs:** Product, debentures, price/debenture (from master on select).

**Scenario table** (matches Non-PP SP Details sheet):

| Column | Logic |
|--------|--------|
| Final fixing | Initial index fixing × (1 + performance) |
| Performance | Sweep: +100% … −40% (18 rows) |
| Product return | Formula with **Z = performance** (not fixing ratio) |
| XIRR | (1 + return)^(365 ÷ payoff tenor days) − 1 |

**Payoff tenor:** `Payoff Tenor(Days)` from master, else `tenorDays`.

**UI:** `/payoff` — Non-PP SP Details (input + output) + Product Search.

---

## Formatting

- Indian locale: `₹1,62,50,000`, crores/lakhs on charts
- Percentages and numbers: **max 3 decimals**
- Chart Y-axis: compact single-line ticks (`₹13.5kCr`) — Recharts no longer breaks `Cr` onto a second line

Helpers: `lib/utils.ts` (`formatCrores`, `formatPercent`, `formatChartAxisMoney`).

---

## Analytics (Portfolio)

| View | Source |
|------|--------|
| Live notional | Sum of `tradeAmount` |
| Maturity ladder | Buckets by days to maturity |
| Lifecycle / coupon / protection / tenor | Weighted by notional |
| Underlying exposure | Top 3 underlyings |

Lifecycle filters: ongoing, expired, maturing-soon, etc.

---

## Key files

| Area | Files |
|------|--------|
| Parse master | `lib/workbook/parser.ts`, `scripts/bake-master-seed.ts` |
| Valuation | `lib/workbook/valuation-engine.ts`, `components/dashboard/unified-valuation.tsx` |
| Payoff | `lib/workbook/payoff-scenarios.ts`, `components/dashboard/unified-payoff.tsx` |
| Dates / IRR | `lib/workbook/dates.ts`, `lib/workbook/irr.ts` |
| Selection state | `lib/context/product-selection-provider.tsx`, `lib/desk-defaults.ts` |
| Charts | `components/charts/chart-kit.tsx` |

---

## Verify (sample product)

**Range Bound Magnifier - 12** · INE093JA7ZR4 · val date 31-May-26 · Nifty 23,547.75 · 100 debentures @ ₹1,25,000:

- Product value ≈ **₹1,62,500**
- Abs. return ≈ **30%**
- IRR ≈ **5%** (not astronomical)
- Total ≈ **₹1,62,50,000**

---

## Local Excel (not in git)

- `New Product Master_.xlsx`
- `Dashboards - 31st May 26/*.xlsm`

Run `npm run bake` after master changes to refresh seed.

---

## Scope

- **Primary only** — Rollover / Maximizer / DMF removed from UI and types
- Long column-level docs: `01-`, `02-`, `03-` in this folder (workbook reference)
