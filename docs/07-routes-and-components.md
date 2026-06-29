# Routes & Components

## Routes

| URL | File | Purpose |
|-----|------|---------|
| `/` | `components/dashboard/dashboard-shell.tsx` | Home — lifecycle tabs, KPIs, lifecycle intelligence, maturity ladder |
| `/valuation` | `components/dashboard/unified-valuation.tsx` | Mark-to-market |
| `/payoff` | `components/dashboard/unified-payoff.tsx` | Payoff scenarios + curve |
| `/portfolio/details` | `components/dashboard/utility-pages.tsx` | Product details |
| `/portfolio/analytics` | `components/dashboard/portfolio-analytics.tsx` | Analytics lab — KPIs + product list |
| `/intelligence` | Logic atlas | Formula documentation |
| `/upload` | Upload + validation | Master file ingest |
| `/api/market/levels` | `app/api/market/levels/route.ts` | Yahoo Nifty/Sensex |
| `/api/parse` | `app/api/parse/route.ts` | Workbook upload parse |

---

## Lifecycle UI (shared pattern)

Tabs: **Ongoing · Expiring in 3M · Expiring in 1M · Expired** (no “All Products”).

| Component | Role |
|-----------|------|
| `lifecycle-product-list.tsx` | Searchable table + export — **full book** in scroll (no row cap) |
| `lifecycle-lab.tsx` | Four KPIs per tab |
| `lifecycle-intelligence.tsx` | Full-book status table — **Home only**; highlights rows in active tab |
| `science-lab.tsx` | Charts filtered by lifecycle tab — **Home + Analytics Lab** |

State: `useState<LifecycleFilter>("ongoing")` passed to both list and analytics on Home/Analytics.

Clock: `usePortfolioClock()` → `asOf` for maturity days and KPI refresh.

---

## Input panel

`components/dashboard/excel-input-panel.tsx`

| Mode | Fields |
|------|--------|
| Valuation | ISIN, product code, name, val date, Nifty, Sensex, debentures |
| Payoff | Name, live level (read-only), purchase date, debentures, price |

Field hints (ℹ️): `INPUT_FIELD_HINTS` in `lib/dashboard-input-config.ts`  
Rendered via `FieldRow` + `FieldHint` in `components/layout/app-ui.tsx`.

Selection state: `lib/context/product-selection-provider.tsx`  
Market sync: `lib/hooks/use-market-sync.ts`

---

## Reveal pattern

`components/ui/reveal-output.tsx` — KPIs and Product Overview **behind** “Click here to view output”.

---

## Styling

| Pattern | File |
|---------|------|
| Transparent buttons | `app/globals.css` `.btn-primary`, `.btn-ghost`, `.btn-pill` |
| Dark dropdowns | `.select-dark` in `globals.css` |
| Payoff table glow | `.payoff-scenarios-stage`, `.pivot-row`, `.current-row` |

---

## Data context

| Provider | Path |
|----------|------|
| Dataset (products) | `lib/context/dataset-provider.tsx` |
| Product selection | `lib/context/product-selection-provider.tsx` |

Default seed: `lib/data/master-seed.json` (from `npm run bake`).
