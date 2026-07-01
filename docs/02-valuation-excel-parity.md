# Valuation — Excel Working Sheet Parity

Reference: `Primary Structured Products Valuation - 31st May 26.xlsm` → sheet **Working**  
Valuation date **B1** = 31-May-26 (serial 46173) · Nifty **D1** · Sensex **C1**

## Column chain (Working sheet)

| Col | Header | Formula / source |
|-----|--------|------------------|
| **B1** | Valuation date | Desk date (46173 = 31-May-26) |
| **C/D** | Index levels | Sensex / Nifty spot |
| **F** | Allotment | Trade / opening date |
| **G** | Valuation date | `=B$1` |
| **H** | Maturity | Maturity date |
| **I** | Obs date | 2nd-last observation on/before B1 |
| **K** | Entry level | Initial fixing |
| **L** | (helper) | `=K*-1` (XIRR outflow) |
| **M** | Current level | `IF(A="Nifty",$D$1,$C$1)` |
| **N** | Exp. underlying @ obs | Forward: `K*(1+XIRR(L:M,F:G))^((I-F)/365)` if `M≥K`, else `"NA"`; else `VLOOKUP(I,AJ:AK,2)` |
| **O** | Underlying perf | `IF(N="NA",M/K-1,N/K-1)` → fed to payoff as **Z** |
| **P** | Formulae | Payoff formula text (Z) |
| **S** | Absolute product return | **ProductReturns** named range → `Working (2)!R` |
| **T** | IRR | `(1+S)^(365/(H-F))-1` |
| **U** | Clients inv. | Debenture deal price (₹1L / ₹1.25L) |
| **V** | Final valuation | See below |
| **X** | Product value | `IF(V>U,V,U)` |
| **Y** | Product IRR | `(X/U)^(365/(G-F))-1` |
| **Z** | Abs. return | `X/U-1` |
| **AJ:AK** | Index history | Nifty closes for historical **N** |

## V — final valuation (column V)

Excel (row *n*):

```
=IF(I_n-$B$1>=0,
    U_n*((1+T_n)^(($B$1-F_n)/365)),
    U_n*(1+((1+S_n)/((1+11%)^((H_n-$B$1)/365))-1)))
```

Where **T** = `(1+S)^(365/(H-F))-1`.

Web implementation: `computeWorkingFinalValuation()` in `lib/workbook/valuation-serial.ts`.

- **True branch** (`I ≥ B1`): forward obs on/after desk date — compound with **T** from allotment to **B1**.
- **False branch** (`I < B1`): discount `(1+S)` from maturity to **B1** at **11%** using **(H−B1)** serial days (signed — can be negative when maturity is before desk date).

## Web mapping

| Excel | Web |
|-------|-----|
| N, O | `valuation-performance.ts` |
| S | `evaluatePayoffFormula(P, O)` or desk `formulaReturn` |
| V, X, Y, Z | `valuation-engine.ts` + `valuation-serial.ts` |
| AJ:AK | `lib/data/valuation-index-history.json` |

## Audit

```bash
npm run verify:valuation
```

Report: `docs/valuation-audit-31-may-26.md`

- **Mode A** — master file dates/levels vs Working (expect drift vs May-26 snapshot).
- **Mode B** — matched Working row inputs F/H/I/K/M/U + **P/S** (formula proof).

Duplicate ISINs (rollover phases): matched by product name + maturity ≥ B1 (`working-row-match.ts`).

## Note on 29-May vs 31-May

The repo workbook is frozen at **31-May-26** (B1). There is no separate 29-May snapshot; all parity runs use **B1 = 31-May-26**.
