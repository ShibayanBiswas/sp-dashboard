# Payoff & Formula Engine

## Core symbol

**Z** = underlying performance vs initial fixing (decimal):

```
Z = (currentOrFinalLevel / entryLevel) − 1
```

Example: Nifty 23,548 vs entry 16,800 → Z ≈ **0.402** (+40.2%).

Payoff page **Current Level** = live Yahoo Nifty/Sensex (`resolveLiveIndexLevel`) — read-only.

---

## Formula engine

File: `lib/workbook/formula-engine.ts`

1. Strip leading `=`
2. Replace `%` tokens → decimal (`7500%` → `75.0` in expression after ÷100 — actually `7500%` → `75` wait)

Tokenization: `7500%` → `75` (7500/100). So `(Z-32%)*7500%` → `(z-0.32)*75`.

3. Replace `IF(cond, a, b)` → ternary (supports chained IFs via `parseAllIfs`)
4. `MIN`/`MAX`/`ABS` → `Math.min`/`Math.max`/`Math.abs`
5. Evaluate with `new Function("z", "Math", ...)`

Public API:

| Function | Use |
|----------|-----|
| `evaluatePayoffFormula(formula, z)` | Returns number; errors → 0 |
| `tryEvaluatePayoffFormula(formula, z)` | QA — returns `{ ok, value \| error }` |
| `buildPayoffCurve(formula)` | Chart points |

---

## Scenario table

Files: `lib/workbook/payoff-scenarios.ts`, `payoff-pivots.ts`  
UI: `components/ui/payoff-scenarios-table.tsx`

`buildEnhancedPayoffScenarioTable(product, inputs, marketMove)`:

- Standard Excel offset rows
- **Pivot rows** at formula kinks (32%, 33%, −15%, …)
- **Current row** highlighted at live `marketMove`

CSS: `.pivot-row`, `.current-row` in `app/globals.css`

---

## Inputs (payoff)

| Field | Source |
|-------|--------|
| Product | Lifecycle-filtered pool |
| Current Level | Yahoo live index |
| Purchase Date | Master trade date default |
| No. of Debentures | `inferDebentureCount()` from notional ÷ price |
| Price / Debenture | Master **price per debenture** |

---

## Known formula limitations

Some master rows reference Excel-only tokens — engine cannot evaluate:

| Token | Example product | QA code |
|-------|-----------------|--------|
| ISIN as formula | Protected call row | `FORMULA_EVAL` |
| `(Z%)*100%` typo | Nifty Accelerator 407 | `FORMULA_EVAL` |
| `MAZ`, `C2`, `Z0` | Legacy workbook refs | `FORMULA_EVAL` |

Fix in **Formulae** column in master Excel, then rebake.

---

## Debug payoff

```bash
npx tsx -e "
import seed from './lib/data/master-seed.json';
import { evaluatePayoffFormula } from './lib/workbook/formula-engine';
const p = seed.products.find(x => x.isin === 'INE093JA77C4');
for (const z of [0, 0.32, 0.33, 0.40]) {
  console.log('Z', z, '→', (evaluatePayoffFormula(p.formulaText, z)*100).toFixed(1)+'%');
}
"
```

| Symptom | File |
|---------|------|
| Wrong move % | `resolveLiveIndexLevel`, entry level |
| Missing pivot rows | `findPayoffPivotZs` |
| Chart vs table mismatch | Same `marketMove` prop to both |
