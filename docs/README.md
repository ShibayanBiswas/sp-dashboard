# SP Dashboard — Documentation Index

All desk reference docs live in **`docs/`**. Start here.

| # | Document | Use when you need… |
|---|----------|-------------------|
| 01 | [Architecture](01-architecture.md) | Stack, data flow, routes, auto-update behaviour |
| 02 | [Valuation Excel parity](02-valuation-excel-parity.md) | Working sheet columns, V/X/IRR logic, worked example |
| 03 | [Testing & debug](03-testing-debug.md) | Smoke tests, `npm run verify`, symptom → file map |
| 04 | [Lifecycle analytics KPIs](04-lifecycle-analytics-kpis.md) | **AUM, Avg Coupon, Listed, Protected** — formulas & audit |
| 05 | [Narrative & master Excel](05-narrative-master-excel.md) | 600%, 7500%, product explanations, Primary sheet columns |
| 06 | [Payoff & formula engine](06-payoff-formulas.md) | Z performance, IF formulas, scenario table, pivots |
| 07 | [Routes & components](07-routes-and-components.md) | Page → file map, UI patterns, input fields |
| 08 | [Debug playbook](08-debug-playbook.md) | Step-by-step troubleshooting by symptom |

## Quick commands

```bash
npm run dev              # local app http://localhost:3000
npm run verify           # bake seed + counts + full product QA
npm run verify:full        # all products: formulas + narrative + payoff
npm run verify:kpis        # lifecycle KPI audit (Ongoing / Expired / …)
npm run bake               # New Product Master_.xlsx → master-seed.json
```

## Master Excel (local, gitignored)

| File | Role |
|------|------|
| `New Product Master_.xlsx` | Source of truth — **Primary** sheet → products, Formulae, Product Explanation |
| `Dashboards - 31st May 26/*.xlsm` | Reference valuation / payoff workbooks |

After updating the master file:

1. Place `New Product Master_.xlsx` in repo root  
2. Run `npm run verify`  
3. Upload from Home in the app (or restart dev server to pick up baked seed)

## Verified snapshot (29-Jun-2026 · Ongoing bucket)

| KPI | Value | Script |
|-----|-------|--------|
| Products | 2,301 | `npm run verify:kpis ongoing` |
| AUM | ₹24,840.36 Cr | same |
| Avg Coupon | 96.7% | same |
| Listed | 0.5% (11 products) | same |
| Protected | 0.0% (1 product) | same |

See [04-lifecycle-analytics-kpis.md](04-lifecycle-analytics-kpis.md) for exact formulas.
