# SP Dashboard

**Primary structured-products** desk dashboard — valuation, payoff scenarios, and portfolio analytics in one web app.

## Features

- **Home** — live notional, maturity ladder, product search
- **Valuation** — mark-to-market by product (inputs, KPIs, product list)
- **Payoff** — scenario table and payoff curve per product formula
- **Portfolio Analytics** — lifecycle, coupons, protection mix, tenor, top underlyings
- **Master upload** — drop an updated `New Product Master_.xlsx` from Home

## Quick start

```bash
npm install
npm run bake      # optional — refresh seed from local Excel
npm run dev       # http://localhost:3000
```

Reference workbooks stay local (see `.gitignore`).

## Recent updates (Jun 2026)

- **Valuation IRR** — uses trade/allotment date from master, not purchase date; two-digit years parse correctly (e.g. `31-May-26` → 2026)
- **Payoff table** — matches workbook: Z = performance sweep; final fixing = initial index × (1 + performance); tenor from **Payoff Tenor(Days)** column
- **Charts** — money axis labels on one line (`₹13.5kCr`); wider left margin so ticks are not clipped
- **Formatting** — Indian ₹ grouping; max 3 decimal places; no scientific notation on IRR
- **Dynamic master** — entry level, formula, price/debenture, and tenor read from uploaded Primary sheet (no hardcoded product values)

## Documentation

| Doc | What it covers |
|-----|----------------|
| [04-full-codebase-audit.md](docs/04-full-codebase-audit.md) | **Start here** — how the app works today |
| [01-input-master-workbook.md](docs/01-input-master-workbook.md) | Primary sheet columns (reference) |
| [02-primary-valuation-workbook.md](docs/02-primary-valuation-workbook.md) | Valuation workbook mapping |
| [03-primary-payoff-workbook.md](docs/03-primary-payoff-workbook.md) | Payoff workbook mapping |

## Stack

Next.js · React · TypeScript · Tailwind · Recharts · XLSX

## License

Proprietary — Anand Rathi Wealth Limited desk tooling.
