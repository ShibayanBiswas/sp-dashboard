# Routes & Components

## Routes

| URL | File | Purpose |
|-----|------|---------|
| `/` | `components/dashboard/dashboard-shell.tsx` | Home — lifecycle tabs, KPIs, lifecycle intelligence, maturity ladder |
| `/valuation` | `components/dashboard/unified-valuation.tsx` | Mark-to-market |
| `/payoff` | `components/dashboard/unified-payoff.tsx` | Payoff scenarios + curve |
| `/portfolio/details` | `components/dashboard/utility-pages.tsx` | Product details |
| `/portfolio/analytics` | `components/dashboard/portfolio-analytics.tsx` | Analytics lab — KPIs + product list |
| `/intelligence` | `components/reference/logic-atlas-console.tsx` | Logic Atlas — pipeline maps, live book KPIs, computation primitives |
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
| `science-lab.tsx` | Charts filtered by lifecycle tab — **Analytics Lab only** |

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
| ARWL theme tokens | `app/globals.css`, `tailwind.config.ts`, `lib/chart-theme.ts` |
| Header logo | `components/layout/brand-logo.tsx`, `public/brand/arwl-logo.svg` |
| Buttons | `.btn-primary` (gold), `.btn-ghost`, `.btn-pill` in `globals.css` |
| Dark dropdowns | `.select-dark` in `globals.css` (forms stay light) |
| Payoff table glow | `.payoff-scenarios-stage`, `.pivot-row`, `.current-row` (gold highlight) |

---

## Data context

| Provider | Path |
|----------|------|
| Dataset (products) | `lib/context/dataset-provider.tsx` |
| Product selection | `lib/context/product-selection-provider.tsx` |

Default seed: `lib/data/master-seed.json` (from `npm run bake`).
