# Master Primary sheet — column logic & edge cases

Reference file: **`New Product Master_.xlsx`** · sheet **Primary** (only category parsed).

Parser: `lib/workbook/parser.ts` · types: `lib/types.ts` · guards: `lib/product-data-guards.ts`

## Column map (Excel → app)

| Master column | `ProductRecord` / `raw` | Used in |
|---------------|-------------------------|---------|
| Month | `month` | Lifecycle, allotment fallback |
| Trade Date/Opening date, Allotment Date | `raw` | Valuation F, IRR elapsed, date picker min |
| Name on Signup Form / Product Name | `name` | Identity, UI |
| Underlying | `underlying` | Nifty vs Sensex level selection |
| Series | `series` | Product code |
| Issuer | `issuer` | Display |
| ISIN No. | `isin` | Identity |
| Actual Entry Level, Entry Level | `raw` → entry | Valuation K, payoff fixing |
| Target Nifty / Target Level | `raw` | Target display, entry fallback |
| Observation Months, Avg. 2–7 | `raw` | Working I — 2nd-last obs |
| Last Observation Date | `lastObservationDateRaw` | Obs fallback |
| Trade Amount | `tradeAmount` | Notional, max debentures |
| price per debenture | `pricePerDebenture`, `raw` | U, max debentures |
| Coupon (%) | `couponPercent` | Analytics |
| Tenor | `tenorDays` | Payoff XIRR tenor |
| Maturity / Maturity date | `maturityRaw` | Valuation H |
| **Formulae** | `formulaText` | Payoff S, valuation S — **required** |
| Product Explanation | `productExplanation`, `raw` | Narrative — warn if missing |
| Principal Protection | `principalProtection` | Routing, specs |
| Listing | `listing` | Specs |
| Product Type | `productType` | Specs |

All other Primary columns are kept in `product.raw`. **NaN / blank cells stay null** — never filled with zeros in Mongo sync (`lib/db/sanitize-for-mongo.ts`).

## Valuation Working sheet

Full column chain: **`docs/02-valuation-excel-parity.md`**

Desk date for parity audits: **31-May-26** (B1 = 46173). No separate 29-May workbook in repo.

## Payoff (Non-PP SP Details)

| Col | Meaning | Web |
|-----|---------|-----|
| G | Performance sweep | `PAYOFF_SCENARIO_OFFSETS` |
| F | Final fixing | entry × (1+G) |
| Z / H | Formula input / return | `evaluatePayoffFormula` |
| I | Maturity amount | investment × (1+H) |
| XIRR column | Remaining tenor IRR | `irrFromReturn` |

Kink detection: `lib/workbook/payoff-kinks.ts` — highlighted on chart (amber dots) and table (`pivot-row` class).

## Edge cases (app behaviour)

| Condition | Behaviour |
|-----------|-----------|
| Missing **Formulae** | Output blocked; alert; show disclaimer panel |
| Missing **Product Explanation** | Warning disclaimer; optional alert on product select |
| Missing **entry level** | Output blocked — cannot compute Z |
| Missing **observation dates** | Warning only; Nifty/Sensex still fetched for valuation date via Yahoo/Mongo |
| Missing **trade date** | Warning; valuation date picker unrestricted on min |
| NaN numeric cells | Stored as null; displayed as **—** where applicable |
| Duplicate ISIN (rollover) | Working row matched by name + maturity ≥ B1 |

## Market data

- Live & historical index: `lib/market-data.ts`, `/api/market/levels`, `/api/market/index-at-date`
- Mongo optional: `index_prices` collection when `MONGODB_URI` set

## Verification

```bash
npm run verify:valuation    # 2281/2281 Mode B vs Working 31-May-26
npm run verify:edge-cases   # Master NaN / missing-field scan
```
