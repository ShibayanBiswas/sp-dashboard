# SP Dashboard

Primary structured-products desk — valuation, payoff, portfolio lifecycle, and analytics mirroring the Excel workbooks.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload **New Product Master_.xlsx** from Home to refresh the book.

## Modules

| Route | Purpose |
|-------|---------|
| `/` | Home — lifecycle lists, maturity ladder, desk shortcuts |
| `/valuation` | Live mark-to-market (Excel Working sheet parity) |
| `/payoff` | Payoff scenarios and curve |
| `/portfolio/details` | Product details — horizontal layout, lifecycle filters |
| `/portfolio/analytics` | Analytics lab + lifecycle export |
| `/intelligence` | Logic atlas |
| `/upload` | Master upload & validation |

## Lifecycle buckets

- **Ongoing** — maturity more than 3 months away  
- **Expiring in 3M** — within 90 calendar days (includes 1M bucket)  
- **Expiring in 1M** — within 30 calendar days  
- **Expired** — past maturity (no live valuation)

Each bucket has a searchable product list and **Export view** / **Full workbook** (multi-sheet `.xlsx` with all master fields).

## Valuation logic

Face value (typically ₹1L) drives client investment. Product value **X** = `max(V, U)` from the Working sheet; discount branch when last observation is before valuation date. IRR uses allotment → valuation elapsed days.

## Documentation

**Start here → [docs/README.md](docs/README.md)** (full index)

| Doc | Contents |
|-----|----------|
| [docs/README.md](docs/README.md) | **Index** — links to all reference docs |
| [docs/01-architecture.md](docs/01-architecture.md) | Modules, routes, auto-update |
| [docs/02-valuation-excel-parity.md](docs/02-valuation-excel-parity.md) | Working sheet formulas |
| [docs/03-testing-debug.md](docs/03-testing-debug.md) | Smoke tests, verify scripts, debug map |
| [docs/04-lifecycle-analytics-kpis.md](docs/04-lifecycle-analytics-kpis.md) | **AUM, Avg Coupon, Listed, Protected** |
| [docs/05-narrative-master-excel.md](docs/05-narrative-master-excel.md) | 600%, 7500%, master columns |
| [docs/06-payoff-formulas.md](docs/06-payoff-formulas.md) | Z, formula engine, scenarios |
| [docs/07-routes-and-components.md](docs/07-routes-and-components.md) | Page → file map |
| [docs/08-debug-playbook.md](docs/08-debug-playbook.md) | Step-by-step troubleshooting |

## Scripts

```bash
npm run build         # production build
npm run verify        # bake seed + counts + full product QA
npm run verify:full   # all products (formulas + narrative)
npm run verify:kpis   # lifecycle KPI audit (Ongoing / Expired / …)
npm run bake          # regenerate lib/data/master-seed.json
```

## Stack

Next.js · TypeScript · Tailwind · Recharts · xlsx · date-fns

Reference workbooks (local, gitignored): `New Product Master_.xlsx`, `Dashboards - 31st May 26/*.xlsm`.
