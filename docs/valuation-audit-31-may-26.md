# Valuation parity audit — 31 May 2026

Generated: 2026-07-01T05:43:37.863Z

## Reference

- Workbook: `Dashboards - 31st May 26/Primary Structured Products Valuation - 31st May 26.xlsm`
- Sheet: **Working** (X = Product Value, Y = Product IRR, Z = Abs. Return)
- Valuation date: **31-May-26** (Excel serial 46173)
- Nifty (D1): **23547.75** · Sensex (C1): **74775.74**
- Universe: **2287** ongoing Primary products with formula, applicable at valuation date

## Summary

| Mode | Pass | Fail | Tested | Notes |
| --- | ---: | ---: | ---: | --- |
| **A — Current master file** | **1700** | 581 | 2281 | Uses `New Product Master_.xlsx` dates & entry levels |
| **B — Excel Working row inputs** | **2281** | 0 | 2281 | F/H/I/K/M/U + P/S from matched Working row |

| Other | Count |
| Missing in Excel Working | 6 |
| Excel rows not in ongoing master | 1624 |

**Master-file overall: PARTIAL**
**Formula replay (Excel row inputs): PASS**

## Engine — Working column chain

| Col | Field | Source |
| --- | --- | --- |
| B1 | Valuation date | Desk input |
| C/D | Sensex / Nifty | Market levels |
| F | Allotment date | Master / Working row |
| G | Valuation date | =B$1 |
| H | Maturity date | Master / Working row |
| I | 2nd-last obs date | Master obs schedule |
| K | Entry level | Master |
| L | =−K | Cashflow for XIRR |
| M | Current index | IF(Nifty,D1,C1) |
| N | Exp. underlying @ obs | XIRR forward or AJ:AK VLOOKUP |
| O | Underlying perf | N/K−1 or M/K if NA |
| P | Payoff formula (Z) | Master / Working row |
| S | ProductReturns | EVALUATE Working(2)!R (ProductReturns) |
| T | IRR tenor | (1+S)^(365/(H−F))−1 |
| U | Client investment | Debenture price |
| V | Final valuation | IF(I−B1≥0,U(1+T)^((B1−F)/365), U(1+(1+S)/1.11^((H−B1)/365)−1)) |
| X | Product value | max(V,U) |
| Y | Product IRR | (X/U)^(365/(G−F))−1 |
| Z | Abs. return | X/U−1 |
| AJ:AK | Index history | Nifty closes for VLOOKUP |

## Engine fixes in this build

- **V column**: exact Excel IF branch with serial (I−B1), T=(1+S)^(365/(H−F))−1
- **N column**: XIRR(L:M,F:G) forward branch with serial day fractions
- **S column**: Mode B uses Working ProductReturns value; Mode A uses master P formula
- **Duplicate ISIN**: match rollover phase by name + maturity ≥ B1
- **Allotment date (F)**: prefer **Allotment Date** over Trade Date — matches Working!F (fixes ~414 Mode A mismatches)

## Mode A — failures (first 30)

| ISIN | Product | Notes |
| --- | --- | --- |
| INE093JA7ZR4 | Range Bound Magnifier - 12 | PV Δ -59468; IRR Δ -6.804 pp; Abs Δ -47.574 pp |
| INE093JA7ZS2 | Range Bound Magnifier - 13 | PV Δ -59979; IRR Δ -6.814 pp; Abs Δ -47.983 pp |
| INE093JA7A02 | Range Bound Magnifier - 14 | PV Δ -59434; IRR Δ -6.810 pp; Abs Δ -47.547 pp |
| INE093JA7B35 | Range Bound Magnifier - 16 | PV Δ -59825; IRR Δ -6.844 pp; Abs Δ -47.860 pp |
| INE093JA7H47 | Range Bound Magnifier - 21 | PV Δ -58738; IRR Δ -7.047 pp; Abs Δ -46.991 pp |
| INE093JA7T43 | Protected Magnifier - 87 | PV Δ -60612; IRR Δ -7.498 pp; Abs Δ -48.490 pp |
| INE093JA7X05 | Nifty Magnifier - 531 | PV Δ -63833; IRR Δ -7.704 pp; Abs Δ -51.066 pp |
| INE093JA7Y20 | Nifty Magnifier - 536 | PV Δ -63705; IRR Δ -7.733 pp; Abs Δ -50.964 pp |
| INE093JA71E3 | Nifty Magnifier - 557 | PV Δ -62693; IRR Δ -7.975 pp; Abs Δ -50.155 pp |
| INE093JA76E2 | Nifty Magnifier - 560 | PV Δ -62569; IRR Δ -8.007 pp; Abs Δ -50.055 pp |
| INE093JA78F5 | Nifty Accelerator - 647 | PV Δ -67229; IRR Δ -8.196 pp; Abs Δ -53.783 pp |
| INE093JA70I6 | Nifty Accelerator - 657 | PV Δ 99743; IRR Δ 12.674 pp; Abs Δ 79.795 pp |
| INE093JA71I4 | Nifty Accelerator - 658 | PV Δ 97244; IRR Δ 12.279 pp; Abs Δ 77.796 pp |
| INE093JA72I2 | Nifty Accelerator - 659 | PV Δ 99715; IRR Δ 12.682 pp; Abs Δ 79.772 pp |
| INE093JA77I1 | Nifty Accelerator - 661 | PV Δ 101190; IRR Δ 12.978 pp; Abs Δ 80.952 pp |
| INE093JA78I9 | Nifty Accelerator - 662 | PV Δ 97919; IRR Δ 12.455 pp; Abs Δ 78.335 pp |
| INE093JA79I7 | Nifty Magnifier - 577 | PV Δ 23482; IRR Δ 2.788 pp; Abs Δ 18.785 pp |
| INE093JA71J2 | Nifty Accelerator - 663 | PV Δ 101016; IRR Δ 13.023 pp; Abs Δ 80.813 pp |
| INE093JA72J0 | Nifty Magnifier - 579 | PV Δ 23448; IRR Δ 2.796 pp; Abs Δ 18.758 pp |
| INE093JA73J8 | Nifty Magnifier - 580 | PV Δ 18753; IRR Δ 2.798 pp; Abs Δ 18.753 pp |
| INE093JA77J9 | Nifty Magnifier - 583 | PV Δ 80410; IRR Δ 10.958 pp; Abs Δ 64.328 pp |
| INE093JA78J7 | Nifty Magnifier - 584 | PV Δ 23434; IRR Δ 2.800 pp; Abs Δ 18.748 pp |
| INE093JA79J5 | Uncapped Accelerator - 116 | PV Δ 98164; IRR Δ 12.922 pp; Abs Δ 78.531 pp |
| INE093JA70K2 | Nifty Accelerator - 664 | PV Δ 104082; IRR Δ 13.551 pp; Abs Δ 83.265 pp |
| INE093JA71K0 | Nifty Accelerator - 665 | PV Δ 98525; IRR Δ 12.646 pp; Abs Δ 78.820 pp |
| INE093JA72K8 | Nifty Accelerator - 666 | PV Δ 104052; IRR Δ 13.558 pp; Abs Δ 83.241 pp |
| INE093JA73K6 | Nifty Magnifier - 585 | PV Δ 80387; IRR Δ 10.964 pp; Abs Δ 64.310 pp |
| INE093JA76K9 | Nifty Accelerator - 668 | PV Δ 109450; IRR Δ 14.083 pp; Abs Δ 87.560 pp |
| INE093JA77K7 | Uncapped Accelerator - 117 | PV Δ 86196; IRR Δ 10.903 pp; Abs Δ 68.956 pp |
| INE093JA78K5 | Nifty Accelerator - 669 | PV Δ 101578; IRR Δ 13.214 pp; Abs Δ 81.262 pp |

_Remaining master-file failures: 551_

## Mode B — failures (first 30)

_None — engine matches Working sheet row-for-row._

## Spot checks

| ISIN | Product | Excel PV | App PV (master) | App PV (excel row) | Excel IRR | App IRR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| INE093JA7Y79 | Nifty Accelerator - 621 | ₹2,39,788 | ₹2,39,788 | ₹2,39,788 | 14.3% | 14.3% |
| INE093JA7ZS2 | Range Bound Magnifier - 13 | ₹2,03,679 | ₹1,43,700 | ₹2,03,679 | 9.4% | 9.4% |

## Method

- Run: `npx tsx scripts/verify-valuation-working-parity.ts`
- Engine: `lib/workbook/valuation-engine.ts` + `lib/workbook/valuation-performance.ts`
- Index history for Working!N lookup: `lib/data/valuation-index-history.json` (from Working!AJ:AK)
- Tolerances: Product Value ±₹1; IRR and Abs Return ±0.05 pp
- Mode A mismatches often mean **master file drift** vs the May-26 workbook Primary snapshot (allotment/maturity/entry)
