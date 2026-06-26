# SP Dashboard

Premium **Primary structured-products** desk dashboard — Excel logic automated into a fast, animated Next.js web app.

## Features

- **Home** — live notional KPIs, maturity ladder, product search, desk module shortcuts
- **Valuation** — mirrors `Actual_Primary Structured Products Valuation` (inputs, output sheet, product list)
- **Payoff** — mirrors `Actual_Automated Primary SP Dashboard` (specifications, scenario table, payoff curve)
- **Portfolio Analytics** — lifecycle, coupon distribution, protection mix, issuer-weighted risk (Document 105)
- **Master re-upload** — drop an updated `New Product Master_.xlsx` from the home page

## Quick start

```bash
npm install
npm run bake      # refresh lib/data/master-seed.json from local Excel (optional)
npm run dev       # http://localhost:3000
```

Place reference workbooks in the project root / `Dashboards - 31st May 26/` (not committed — see `.gitignore`).

## Documentation

Deep references (6000+ words each):

| Doc | Scope |
|-----|--------|
| [01-input-master-workbook.md](docs/01-input-master-workbook.md) | `New Product Master_.xlsx` · Primary sheet |
| [02-primary-valuation-workbook.md](docs/02-primary-valuation-workbook.md) | Primary valuation workbooks |
| [03-primary-payoff-workbook.md](docs/03-primary-payoff-workbook.md) | Primary payoff workbooks |

## Stack

Next.js 16 · React · TypeScript · Tailwind · Framer Motion · Recharts · XLSX

## License

Proprietary — Anand Rathi Wealth Limited desk tooling.
