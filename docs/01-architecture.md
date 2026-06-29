# Architecture

## Stack

| Layer | Tech |
|-------|------|
| UI | Next.js 16 App Router, React, Tailwind, Framer Motion |
| Charts | Recharts |
| Data | `xlsx` parse + export, JSON seed (`lib/data/master-seed.json`) |
| Dates | `date-fns`, desk format `D-Mon-YY` |
| Market | Yahoo Finance via `/api/market/levels` |

## Data flow

```
New Product Master_.xlsx  →  parser.ts  →  ProductRecord[]
                                    ↓
                          dataset-provider (React context)
                                    ↓
     ┌──────────────────────────────┼──────────────────────────────┐
     ↓                              ↓                              ↓
product-lifecycle.ts        valuation-engine.ts            payoff-scenarios.ts
(live clock asOf)           (Working sheet parity)           + payoff-pivots.ts
     ↓                              ↓                              ↓
LifecycleProductList        Unified Valuation                Unified Payoff
Analytics Lab               Product Details
```

## Key modules

| Path | Role |
|------|------|
| `lib/product-lifecycle.ts` | Ongoing / Expiring 3M / 1M / Expired buckets; uses **system clock** |
| `lib/hooks/use-portfolio-clock.ts` | Re-runs lifecycle every minute |
| `lib/hooks/use-market-sync.ts` | Fetches Nifty/Sensex + today’s desk date hourly |
| `lib/market-data.ts` | Yahoo ^NSEI, ^BSESN; `formatDeskDate()` |
| `lib/workbook/valuation-engine.ts` | Excel Working: O, S, V, X, IRR |
| `lib/workbook/payoff-pivots.ts` | Kink detection + enhanced scenario table |
| `lib/workbook/export-products.ts` | Multi-sheet lifecycle Excel download |
| `components/ui/reveal-output.tsx` | “Click here” gated output panels |
| `components/ui/identity-selects.tsx` | Dark ISIN / product-code dropdowns |

## Routes

| Route | Component |
|-------|-----------|
| `/` | `dashboard-shell.tsx` |
| `/valuation` | `unified-valuation.tsx` |
| `/payoff` | `unified-payoff.tsx` |
| `/portfolio/details` | `utility-pages.tsx` → `ProductDetailsPage` |
| `/portfolio/analytics` | `portfolio-analytics.tsx` + `science-lab.tsx` + `lifecycle-lab.tsx` |

## Lifecycle auto-update

- **Portfolio by Lifecycle** passes `asOf = new Date()` via `usePortfolioClock`.
- Counts, AUM, and bucket membership recompute when calendar day changes or every 60s.
- Home KPIs call `getPortfolioHeadlineStats(dataset, asOf)`.

## Market auto-update

- On load: `ProductSelectionProvider` calls `/api/market/levels`.
- Sets **Valuation Date** = today (desk format), **Nifty** / **Sensex** from Yahoo.
- Refreshes hourly + on tab focus; manual **Refresh levels** in input panel.
- Product identity (ISIN, name) persists in localStorage; market fields always live.
- **Payoff Current Level** is read-only — always live Nifty/Sensex from Yahoo (`resolveLiveIndexLevel`), not manual entry or stale stored level.

## Product narrative formatting

- Master sheet stores participation as `7500%` meaning **75.0%** (Excel ×100 convention).
- `lib/product-narrative-format.ts` converts e.g. `PR of 7600% (7500%+100%)` → **76.0% (75.0% participation + 100% coupon)**.
- Level bands like `132% of Initial Nifty` display as **132% of initial fixing (+32% index move)**.
- Product Overview renders inside **RevealOutput** on Payoff, Valuation, and Product Details.

## UI patterns

- **RevealOutput** — inputs visible; KPIs/charts/tables behind “Click here to view output”.
- **Horizontal spec rails** — one card per field, scroll horizontally.
- **select-dark** — transparent dark dropdowns for ISIN, product code, debentures.
