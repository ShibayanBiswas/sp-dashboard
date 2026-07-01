# Debug Playbook

Step-by-step fixes for common desk issues. Cross-reference [03-testing-debug.md](03-testing-debug.md) for commands.

---

## 1. Lifecycle KPIs wrong (AUM / Coupon / Listed / Protected)

1. Run `npm run verify:kpis ongoing` — compare to UI  
2. Confirm tab matches (Ongoing vs Expired)  
3. Check master **Trade Amount**, **Coupon (%)**, **Listing**, **Principal Protection**  
4. Confirm `usePortfolioClock` — KPI timestamp should update every minute  

→ Details: [04-lifecycle-analytics-kpis.md](04-lifecycle-analytics-kpis.md)

---

## 2. Valuation numbers wrong

1. Confirm product is **not expired** (`isValuationApplicable`)  
2. Check **face** = ₹1L via `getClientInvestment()` — not debenture price  
3. Verify Nifty vs Sensex for underlying (`resolveValuationLevel`)  
4. CLI test INE093JA7Q38 — see [02-valuation-excel-parity.md](02-valuation-excel-parity.md)  

| Wrong X | Likely cause |
|---------|--------------|
| ~₹198 vs ~₹198k | Using price not face |
| IRR extreme | Allotment date = val date |
| Zero | Missing formula or level |

---

## 3. Payoff / narrative wrong

1. **7600% / 600% in UI** → `lib/product-narrative-format.ts`  
2. **Wrong live move** → Payoff level must be Yahoo (`resolveLiveIndexLevel`)  
3. **132–133% band** → index move +32–33%, not 132% move  
4. Run `npm run verify:full` for product-specific formula errors  

→ [05-narrative-master-excel.md](05-narrative-master-excel.md), [06-payoff-formulas.md](06-payoff-formulas.md)

---

## 4. After uploading new master

```bash
npm run verify          # full pipeline
npm run verify:kpis     # KPI audit all buckets
```

Upload from Home also triggers client-side parse. If counts wrong:

```bash
npm run bake            # refresh seed
```

Expected Primary count: **4533** products, **4471** formulas (`lib/workbook/expected-counts.ts`).

---

## 5. Build / dev failures

| Error | Fix |
|-------|-----|
| Google Fonts fetch | Retry `npm run build` online |
| Port 3000 / 8000 in use | `bash start-dashboard.sh` (stops stale ports) or `bash start-dashboard.sh --stop` |
| Python venv missing | First run of `start-dashboard.sh` creates `backend/python/.venv` |
| Type errors | `npm run typecheck` |

---

## 6. Ongoing products failing QA

Current known master issues (re-run `verify:full` to refresh):

- **Nifty Accelerator 407** — bad formula `(Z%)*100%`  
- **Protected call 431-434** — Formulae cell is ISIN only  

Fix in Excel **Formulae** column, then `npm run verify`.

---

## Symptom → file quick map

| Symptom | First file to open |
|---------|-------------------|
| Lifecycle count | `lib/product-lifecycle.ts` |
| AUM / coupon KPI | `lifecycle-lab.tsx`, `product-utils.ts` |
| Valuation X / IRR | `valuation-engine.ts` |
| Payoff formula | `formula-engine.ts` |
| Narrative text | `product-narrative-format.ts` |
| Live Nifty | `market-data.ts`, `/api/market/levels` |
| Export Excel | `export-products.ts` |
| Parse upload | `parser.ts` |
