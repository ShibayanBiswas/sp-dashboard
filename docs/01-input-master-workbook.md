# Input Master Workbook — `New Product Master_.xlsx` (Primary Sheet Reference)

> Technical reference for analysts and developers working on the SP Dashboard.
> Scope: the **single input workbook** `New Product Master_.xlsx` and, within it, the
> **`Primary`** sheet only. The application is now **Primary-only** — every other tab in
> the workbook is either parsed-but-hidden or still under process and is **not surfaced**
> in the live product views.

---

## 1. Overview & Purpose

`New Product Master_.xlsx` is the **system of record** for structured-product (SP) issuance.
It is a manually maintained Excel workbook that the operations desk updates as new
debentures/products are signed up, rolled over, matured, or extinguished. The SP Dashboard
ingests this workbook directly (no intermediate database) and turns its rows into
`ProductRecord` objects that drive every metric, chart, lifecycle view, and formula catalog
in the app.

The dashboard's contract with this workbook is deliberately loose: instead of relying on
fixed column positions, the parser matches **header text** against a curated dictionary of
acceptable aliases (`TARGET_HEADERS`). This means an analyst can re-export or re-share a
fresh copy of the master, add new products at the bottom, and re-upload it without breaking
the pipeline — as long as the header *row* still contains recognizable labels.

The Primary sheet is the heart of the workbook. As of the June 2026 snapshot it holds the
bulk of the firm's primary-issuance SP book:

| Metric | Value |
| --- | --- |
| Sheet dimension | `A1:AR4553` |
| Header row | Row 2 |
| Declared columns | 39 |
| Products parsed (valid rows) | 4533 |
| Rows carrying a payoff formula | 4471 |
| Expired as of Jun 2026 | ~2123 |
| Active (ongoing + maturing-soon + unknown) | ~2301 |
| Rows with empty maturity | 52 |

These counts are **pinned** in `lib/workbook/expected-counts.ts` and are used as a
validation tripwire (see [§8 Validation](#8-validation)).

```1:7:lib/workbook/expected-counts.ts
/** Baseline counts from New Product Master_.xlsx — cell-aligned verification. */
export const EXPECTED_PRODUCT_COUNTS: Record<string, { products: number; formulas: number }> = {
  Primary: { products: 4533, formulas: 4471 },
};
```

---

## 2. Sheet Topology

The workbook contains far more than the Primary sheet. The parser discovers **all** sheets
(`workbook.SheetNames`) and records their visibility, but only a subset is treated as a
product category. The complete tab inventory captured in `master-schema.json` is:

| Sheet | Dimension | Role today |
| --- | --- | --- |
| `Primary` | `A1:AR4553` | **Active** — the only category surfaced in the app |
| `2nd last obs dates` | `B1:H3444` | Hidden dependency (observation-date lookups) |
| `Sheet1` | `B2:E33` | Hidden scratch/lookup |
| `Sheet2` | `A1:AS1703` | Hidden scratch/lookup |
| `Sheet3` | `C2:G33` | Hidden scratch/lookup |
| `NM (6 Mo.)` | `B1:AF152` | Hidden, under process |
| `Extinguished Phase I` | `C2:H247` | Hidden, historical |
| `Perpetual` | `A2:AH10` | Hidden, perpetual instruments |

Two important behaviors follow from this topology:

1. **Category gating.** Only sheets whose names appear in `PRODUCT_CATEGORIES` become
   pinned expected counts), the *Primary-only* product surface means the live UI presents
   Primary data. The other category sheets remain "parsed-but-hidden": their rows are read
   and validated, but they are not promoted to the active product list shown to users.

2. **Hidden dependencies.** Several tabs (`2nd last obs dates`, `Sheet1/2/3`,
   `NM (6 Mo.)`, `Extinguished Phase I`, plus dashboard helper tabs like `Master`,
   `Working`, `Dump`) are tracked in `HIDDEN_DEPENDENCIES` and reported as
   `hiddenDependencySheets`. They feed Excel-side formula chains, not the dashboard's own
   computation, but their presence is validated so a stripped-down workbook can be flagged.

```48:62:lib/workbook/parser.ts
const HIDDEN_DEPENDENCIES = [
  "2nd last obs dates",
  "Sheet1",
  "Sheet2",
  "Sheet3",
  "NM (6 Mo.)",
  "Extinguished Phase I",
  "Master",
  "Working",
  "Working (2)",
  "Dump",
  "Secondary Master",
  "Combined Portfolio - Input",
  "Equity Portfolio Returns",
];
```

> **Unlocking hidden/protected sheets.** Some tabs are protected or set to
> `hidden`/`veryHidden` in Excel. The workbook password is **`master@123`**. Analysts must
> unprotect with this password before manually editing those tabs; the dashboard parser
> reads cell values regardless of visibility, so unlocking is only needed for human edits.

---

## 3. Primary Column Dictionary

The Primary sheet declares **39 columns** with the header row on **row 2**. Listed below in
spreadsheet order, with meaning, expected data type, and the role each plays in valuation,
payoff, or lifecycle. The "Parser field" column shows which `ProductRecord` property (if
any) the value maps to via `TARGET_HEADERS`.

| # | Column header | Type | Meaning / role | Parser field |
| --- | --- | --- | --- | --- |
| 1 | `Month` | text | Issuance/booking month label; grouping & cohorting | `month` |
| 2 | `Trade Date/Opening date` | date | Trade/opening date; lifecycle anchor for "upcoming" | `tradeDate` |
| 3 | `Name on Signup Form` | text | Client-facing product name; primary identity | `name` |
| 5 | `Underlying` | text | Reference index/asset (e.g., Nifty) | `underlying` |
| 6 | `Series` | text | Issuer series/tranche code | `series` |
| 7 | `Trade Date/Opening date` | date | **Duplicate** of col 2 (see §4) | `tradeDate` (first match wins) |
| 8 | `Issuer` | text | Issuing entity | `issuer` |
| 9 | `ISIN No.` | text | ISIN identifier; secondary identity key | `isin` |
| 10 | `Actual Entry Level` | number | Underlying level at trade; payoff entry | raw only |
| 11 | `Target Nifty` | number | Strike/target underlying level; payoff trigger | raw only |
| 12 | `Average 1` | number | Observation-average input #1 | raw only |
| 13 | `Avg. 2` | number | Observation-average input #2 | raw only |
| 14 | `Avg. 3` | number | Observation-average input #3 | raw only |
| 15 | `Avg. 4` | number | Observation-average input #4 | raw only |
| 16 | `Avg. 5` | number | Observation-average input #5 | raw only |
| 17 | `Avg. 6` | number | Observation-average input #6 | raw only |
| 18 | `Avg. 7` | number | Observation-average input #7 | raw only |
| 19 | `Observation Months` | text/number | Schedule of observation months | raw only |
| 20 | `Last Observation Date` | date | Final observation; lifecycle fallback anchor | `lastObservationDateRaw` |
| 21 | `Trade Amount` | number | Notional / client investment (Rs.) | `tradeAmount` |
| 22 | `Maturity` | date | Maturity date; **primary lifecycle anchor** | `maturityRaw` |
| 23 | `Product Type` | text | Structure family (e.g., participation, autocall) | `productType` |
| 24 | `Principal Protection` | text | PP flag / capital guarantee | `principalProtection` |
| 25 | `Listing` | text | Listed / unlisted | `listing` |
| 26 | `Formulae` | text | Excel-style payoff expression (see §6) | `formulaText` |
| 27 | `Product Explanation` | text | Human-readable payoff narrative | `productExplanation` |
| 28 | `Allotment Date` | date | Allotment; alt trade-date alias | `tradeDate` (alias) |
| 29 | `POED` | date/text | Put Option Exercise Date | raw only |
| 30 | `Coupon / PR / DM` | number/text | Coupon, participation rate, or downside multiplier | `couponPercent` (alias) |
| 31 | `Coupon (%)` | number | Coupon percentage | `couponPercent` |
| 32 | `Tenor` | number | Tenor in days | `tenorDays` |
| 34 | `price per debenture` | number | Per-debenture price | `pricePerDebenture` |
| 35 | `Classification based on tenor` | text | Tenor bucket (short/medium/long) | `tenorBucket` |
| 36 | `Arranger Fees (%)` | number | Arranger fee, percent | raw only |
| 37 | `Upfront fees (%)` | number | Upfront fee, percent | raw only |
| 38 | `Arranger Fees (Rs.)` | number | Arranger fee, absolute | raw only |
| 39 | `Upfront fees (Rs.)` | number | Upfront fee, absolute | raw only |

> **"raw only"** means the value is **not** lifted into a typed `ProductRecord` field, but
> it is still preserved verbatim inside `product.raw[header]`. Nothing is discarded — every
> column for a valid row is retained in the `raw` map keyed by its exact header string. The
> `rawField()` helper (used by lifecycle logic) reads from this map by trying multiple
> aliases, which is how columns like `POED` and the `Avg.*` series stay accessible to
> downstream computations even though they have no first-class property.

---

## 4. Identity & Parsing

### 4.1 How a row becomes a product

The parser does **not** assume Primary starts in column A. Instead it walks the declared
range cell-by-cell with `getSheetMatrix`, locating the header row by scanning the first ~40
rows for known **header markers** (`underlying`, `name on signup form`, `product name`,
`formulae`, `isin no.`, `isin`, `trade amount`, `sr.no`). For Primary, this resolves to
**row 2**. Every non-empty row beneath the header becomes a candidate.

```122:151:lib/workbook/parser.ts
function getSheetMatrix(sheet: XLSX.WorkSheet) {
  const ref = sheet["!ref"];
  if (!ref) {
    return { headers: [] as string[], dataRows: [] as unknown[][], headerRowIndex: 0 };
  }

  const range = XLSX.utils.decode_range(ref);
  let headerRowIndex = range.s.r;

  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 40); r++) {
    const cells: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      cells.push(cell?.w ?? cell?.v ?? null);
    }
    const normalized = cells.map(normalizeHeader);
    if (HEADER_MARKERS.some((marker) => normalized.includes(marker))) {
      headerRowIndex = r;
      break;
    }
  }
```

### 4.2 Name resolution and validity

Identity is resolved in `mapRowToProduct`: the parser prefers a `Product Name` column if one
exists, otherwise falls back to `Name on Signup Form`. The resulting `name` must pass
`isValidProductName`, which rejects empty strings, `unnamed …` placeholders, pure-number
cells, and reserved header words (`month`, `underlying`, `formulae`, `product name`,
`name on signup form`, `sr.no`). This filter is the reason the row count (4553 physical
rows) is larger than the parsed product count (4533): blank spacer rows, stray totals, and
header echoes are silently dropped.

```213:226:lib/workbook/parser.ts
function isValidProductName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("unnamed ")) {
    return false;
  }
  if (/^\d+$/.test(normalized)) {
    return false;
  }
  const blocked = ["month", "underlying", "formulae", "product name", "name on signup form", "sr.no"];
  return !blocked.includes(normalized);
}
```

### 4.3 Header matching via `readField`

Each typed field is read by `readField`, which normalizes both the workbook headers and the
`TARGET_HEADERS` alias list (collapsing whitespace, trimming, lowercasing) and returns the
**first** matching column. ISIN, for example, matches either `ISIN No.` or `ISIN`. Numeric
fields pass through `toNumber` (strips commas, guards non-finite); coupon passes through
`normalizeCoupon`, which divides by 100 when a value reads greater than 1.5 — so `9` and
`0.09` both normalize to a 9% coupon.

---

## 5. Dates & Lifecycle

### 5.1 Date parsing

All date-bearing values flow through `parseExcelishDate` (in `lib/workbook/dates.ts`), which
handles the three forms Excel can hand us:

- **Excel serials** — numbers `> 30000` are treated as days since the 1899-12-30 epoch.
- **Numeric-looking strings** — the same serial logic applies to strings without a `-`.
- **Textual dates** — tried against a pattern list:
  `d-MMM-yy`, `dd-MMM-yy`, `d-MMM-yyyy`, `dd-MMM-yyyy`, `M-yyyy`, `dd/MM/yyyy`, with a final
  fall-through to the native `Date` constructor.

`formatExcelishDate` wraps this and emits a canonical `dd-MMM-yyyy` string, or echoes the raw
value (or `"Unknown"`) when parsing fails. `maturityRaw` and `lastObservationDateRaw` are
stored as these formatted strings on the `ProductRecord`.

### 5.2 Lifecycle classification

`getProductLifecycleStatus` (in `lib/product-lifecycle.ts`) assigns each product one of:
`perpetual`, `upcoming`, `expired`, `maturing-soon`, `ongoing`, or `unknown`, evaluated
against an `asOf` date (defaulting to "now"):

1. **Perpetual** — name or maturity/type text contains `perpetual`.
2. **Upcoming** — trade/allotment date is in the future.
3. Otherwise the **anchor** is `Maturity`, falling back to `Last Observation Date`.
4. **Unknown** — no usable anchor (this is the bucket the 52 empty-maturity rows land in).
5. From the anchor's day-difference: `< 0` → **expired**, `<= 90` → **maturing-soon**,
   else **ongoing**.

```39:48:lib/product-lifecycle.ts
  const maturity = parseExcelishDate(product.maturityRaw);
  const lastObs = parseExcelishDate(product.lastObservationDateRaw);
  const anchor = maturity ?? lastObs;

  if (!anchor) return "unknown";

  const days = differenceInCalendarDays(anchor, asOf);
  if (days < 0) return "expired";
  if (days <= 90) return "maturing-soon";
  return "ongoing";
```

The "Live Book" filter (`ongoing`) intentionally bundles `ongoing + perpetual +
maturing-soon + unknown` so that products with a missing maturity are *not* hidden from the
active book by default. For the Jun 2026 snapshot this yields ~2123 expired Primary products
and ~2301 in the active set, with 52 of those active rows being maturity-empty `unknown`s.

---

## 6. Formula Column & Automation

The `Formulae` column (col 26) is the single most important automation hook in the sheet. It
stores an **Excel-style payoff expression as text** — strings built from `IF`, `MIN`, `MAX`,
and arithmetic on the entry level, target level, and observation averages — that encodes the
product's payoff logic in a portable, human-auditable form. A typical entry resembles:

```text
=IF(Final>=Target, Principal*(1+PR*(Final/Entry-1)), MAX(Floor, Principal*(Final/Entry)))
```

These strings are captured as `product.formulaText` and aggregated into the **formula
catalog** by `buildFormulaCatalog`, which:

- harvests *real* Excel formulas (`sheet_to_formulae`) cell-by-cell, and
- harvests *text* formulas from any `Formulae` column (skipping cells that begin with `=`,
  since those are live Excel formulas already captured above), tagging each with its product
  name and category.

Coverage matters: 4471 of 4533 Primary rows carry a formula. The validation layer warns when
formula coverage for a category drops below 20%, and the category summary surfaces up to 12
distinct payoff profiles per category for quick inspection. Because the formulas are stored
as text, the dashboard can display, group, and diff payoff structures **without executing**
them — the heavy numeric valuation continues to live in the Excel dashboards
(`Primary Structured Products Valuation`, `Automated Primary SP Dashboard`) referenced in
`laneMapping`.

---

## 7. Reupload Safety

A core design goal is that an analyst can drop in a **fresh export** of the master at any
time. Safety comes from three mechanisms:

1. **Generic header matching.** Field resolution keys off `TARGET_HEADERS` aliases, not
   column letters. New products appended at the bottom, reordered columns, or minor header
   renames (within the known alias set) all continue to parse. A header like `Maturity date`
   resolves identically to `Maturity`.

```24:46:lib/workbook/parser.ts
const TARGET_HEADERS = {
  month: ["Month"],
  tradeDate: ["Trade Date/Opening date", "Allotment Date", "Trade Date"],
  productName: ["Product Name"],
  name: ["Name on Signup Form", "Name of Client", "Client Name", "Name"],
  issuer: ["Issuer"],
  isin: ["ISIN No.", "ISIN"],
  underlying: ["Underlying"],
  series: ["Series"],
  tradeAmount: ["Trade Amount", "Actual outflow", "Maturity value", "Investment Amount", "Initial Investment (Rs.)"],
  pricePerDebenture: ["price per debenture", "Price per bond", "Price Per Bond", "Price per bond"],
  couponPercent: ["Coupon (%)", "Coupon / PR / DM", "Product return"],
  tenorDays: ["Tenor", "Product tenor", "Remaining Tenor (days)"],
  tenorBucket: ["Classification based on tenor"],
  maturityRaw: ["Maturity", "Maturity date", "Maturity Date"],
  lastObservationDateRaw: ["Last Observation Date", "Observation date", "Final Observation Dates "],
  formulaText: ["Formulae"],
  productExplanation: ["Product Explanation"],
  principalProtection: ["Principal Protection", "Capital Guarantee"],
  listing: ["Listing"],
  productType: ["Product Type"],
} as const;
```

2. **Header-row auto-discovery.** Even if the header drifts off row 2, `getSheetMatrix`
   re-locates it within the first ~40 rows using `HEADER_MARKERS`. This makes the parser
   resilient to extra title/banner rows being inserted above the table.

3. **Lossless `raw` map.** Every column is preserved in `product.raw`, so a newly added
   column that has no typed mapping is never lost — it remains queryable via `rawField()` and
   can be promoted to a first-class field later by simply extending `TARGET_HEADERS`.

The practical workflow: unlock with `master@123` if needed, append/update rows, save, and
re-upload. New products flow through automatically; the only thing that breaks parsing is the
**absence of recognizable header markers**, which is exactly what validation catches.

---

## 8. Validation

`buildValidationIssues` runs on every parse and produces graded `ValidationIssue`s:

- **Empty category (error).** No rows parsed for a category sheet.
- **Low formula coverage (warning).** Formula presence under 20% of a category's rows.
- **Product-count mismatch (error).** Parsed count ≠ the pinned `EXPECTED_PRODUCT_COUNTS`
  value. For Primary, anything other than **4533** trips this. This is the single best signal
  that a reuploaded master has shifted (rows dropped, alignment broken, wrong file).
- **Formula-count drift (warning).** Parsed formula count ≠ expected (Primary baseline
  **4471**).
- **Missing hidden dependencies (warning).** Fewer than three hidden/dependency sheets.
- **Missing key columns (warning).** A category sheet lacking required headers — for Primary
  these are `Name on Signup Form`, `Underlying`, and `Formulae`.

```423:439:lib/workbook/parser.ts
    const expected = EXPECTED_PRODUCT_COUNTS[category];
    if (expected && categoryProducts.length !== expected.products) {
      issues.push({
        severity: "error",
        category,
        message: `Product count mismatch for ${category}: parsed ${categoryProducts.length}, Excel master has ${expected.products}.`,
      });
    } else if (expected) {
      const formulaCount = categoryProducts.filter((p) => p.formulaText).length;
      if (formulaCount !== expected.formulas) {
        issues.push({
          severity: "warning",
          category,
          message: `Formula count for ${category}: parsed ${formulaCount}, Excel master has ${expected.formulas}.`,
        });
      }
    }
```

When a new legitimate batch of products is added, the expected counts in
`expected-counts.ts` must be re-pinned to the new totals; otherwise the dashboard will
(correctly) flag the larger count as a mismatch.

---

## 9. Pitfalls

  `B1:H3444`) start in **column B**, not A. This is why the parser reads cell-by-cell using
  the decoded `!ref` range rather than assuming a zero-based, column-A origin.
  **Primary starts at A** (`A1:AR4553`), so it is unaffected — but any code that bypasses
  `getSheetMatrix` and indexes raw arrays will silently misalign on B-origin sheets.

- **Duplicate headers.** Primary has **two** `Trade Date/Opening date` columns (cols 2 and 7)
  and the Avg. series spans `Average 1` plus `Avg. 2`…`Avg. 7`. `readField` returns the
  **first** match, so duplicates beyond the first are reachable only through `product.raw`
  (keyed by header — note that a literal duplicate header string collapses to one key, so the
  that "first match wins" is the governing rule.

- **Empty maturity (52 rows).** Rows with no maturity *and* no last-observation date classify
  as `unknown` and are intentionally kept in the Live Book. Treat `unknown` separately when
  computing "true active" notional.

- **Coupon scale ambiguity.** `normalizeCoupon` infers scale from magnitude (>1.5 ⇒ percent).
  A genuine coupon of, say, 1.2 (i.e., 120%) would be left as 1.2 — rare, but worth noting
  for exotic structures.

- **Date format drift.** Only the patterns in `DATE_PATTERNS` plus Excel serials are
  understood. An unusual textual format (e.g., `MM-DD-YYYY`) may fall through to the native
  `Date` parser and misread day/month. Prefer `dd-MMM-yyyy` in the master.

- **Hidden ≠ unread.** Hidden/very-hidden sheets are still parsed; visibility only affects
  human editing (needs `master@123`) and whether the tab is treated as a dependency. Deleting
  a hidden dependency to "clean up" the file will trip the dependency warning.

  expected counts and are validated, but the app is **Primary-only** today. Do not assume
  their absence from the UI means they are unparsed — they are simply not promoted to the
  active product surface yet.

---

### Appendix: `ProductRecord` field ↔ Primary column quick map

| `ProductRecord` field | Primary source column(s) |
| --- | --- |
| `month` | `Month` |
| `name` | `Product Name` → `Name on Signup Form` |
| `issuer` | `Issuer` |
| `isin` | `ISIN No.` / `ISIN` |
| `underlying` | `Underlying` |
| `series` | `Series` |
| `tradeAmount` | `Trade Amount` |
| `pricePerDebenture` | `price per debenture` |
| `couponPercent` | `Coupon (%)` / `Coupon / PR / DM` |
| `tenorDays` | `Tenor` |
| `tenorBucket` | `Classification based on tenor` |
| `maturityRaw` | `Maturity` |
| `lastObservationDateRaw` | `Last Observation Date` |
| `formulaText` | `Formulae` |
| `productExplanation` | `Product Explanation` |
| `principalProtection` | `Principal Protection` |
| `listing` | `Listing` |
| `productType` | `Product Type` |
| `raw[*]` | **every** column, verbatim, keyed by header |

---

## 10. Deep Dive — Primary Sheet Column Semantics (Extended)

Every column on the Primary sheet exists because a human analyst once needed to answer a client question without opening six other files. The web app preserves that intent: anything mapped into `ProductRecord` drives UI or engines; anything in `raw` remains queryable for audit. The sections below walk column groups in the order a structurer thinks about a trade — identity, market linkage, observation mechanics, economics, legal status, and payoff automation.

### 10.1 Identity & lineage block

The first columns (`Month`, trade dates, `Name on Signup Form`, `Series`, `Issuer`, `ISIN No.`) establish **who** sold **what** to **whom**. The signup name is the canonical client-facing label; ISIN is the settlement identifier; series encodes issuer tranche. The parser resolves products by any one of ISIN, series/product code, or name — mirroring the Excel valuation sheet’s “enter any ONE field” UX. When two rows share similar names, ISIN disambiguates; when ISIN is blank (older legacy rows), series plus issuer usually suffices.

### 10.2 Market linkage block

`Underlying`, `Actual Entry Level`, and `Target Nifty` (or Sensex target variants in raw) define the **economic bet**. Entry level is the initial fixing; target is the auto-call or cap reference. These feed `getEntryLevel()` and `getTargetLevel()` in TypeScript. Valuation picks Nifty vs Sensex **current level** using `resolveValuationLevel()` — the same rule as Working!M: IF underlying is Nifty use val-date Nifty, else Sensex.

### 10.3 Observation average ladder

`Average 1` … `Avg. 7` and `Observation Months` capture **Asian-style** or multi-fixing structures. Many payoff formulae reference these implicitly through Excel ranges; the dashboard keeps them in `raw` for future engine extensions. When a product uses single final fixing only, later average columns are blank — the parser does not treat blanks as errors.

### 10.4 Economics block

`Trade Amount`, `price per debenture`, coupon columns, and `Tenor` define **cash flows**. Coupon strings like `59% / 1.59` encode participation and leverage; `parseCouponString()` extracts the headline rate for analytics. Tenor may appear as days (1217) or fractional years (1.147…) — analytics buckets normalize via `tenorDays`.

### 10.5 Legal & listing block

`Principal Protection`, `Listing`, and `Product Type` drive **risk analytics**. Classification uses `classifyProtection()` which checks “non” before “principal protected” to avoid the classic substring bug. Listing status feeds listed-share KPIs; product type separates equity-linked vs debt-linked exposure in the Document-105-inspired risk gauge.

### 10.6 Automation block

`Formulae` and `Product Explanation` are the **automation spine**. Formula text is evaluated by `evaluatePayoffFormula()` where Z is underlying performance. Explanation text renders in the Product Narrative panel — numbered clauses for client decks.

---

## 11. Architecture — From Excel Row to React Row

```mermaid
flowchart LR
  XLSX[New Product Master_.xlsx] --> Parser[parser.ts]
  Parser --> Seed[master-seed.json]
  Seed --> Bootstrap[/api/parse/bootstrap]
  Bootstrap --> Provider[DatasetProvider]
  Provider --> UI[Dashboard pages]
  Provider --> Engines[valuation-engine / payoff-scenarios]
```

1. **Upload or bootstrap** hydrates `DashboardDataset`.
2. **`restrictToActiveCategories`** keeps Primary rows only.
3. **Lifecycle** (`product-lifecycle.ts`) tags ongoing / expired / maturing-soon.
4. **Selection** (`product-selection-provider`) holds ISIN, val date, Nifty/Sensex levels.
5. **Engines** recompute on every input change — no stale Excel cache.

---

## 12. Reupload Playbook (Desk Checklist)

1. Unlock workbook if protected (`master@123` in legacy files).
2. Append rows at bottom of Primary — do not insert blank spacer rows mid-table.
3. Keep header row 2 intact; do not rename `Formulae` or `Name on Signup Form`.
4. Save as `.xlsx`, upload from Home.
5. Confirm validation panel: **4533** products (or update `expected-counts.ts` after legitimate book growth).
6. Spot-check one Nifty and one Sensex product in Valuation — Z should move when val levels change.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| Product count mismatch | Rows dropped / wrong file | Verify Primary sheet row count |
| Coupon analytics all zero | Percent strings not parsed | Fixed via `parseCouponString` — rebake seed |
| Protection pie wrong | Non-PP classified as PP | Fixed via `classifyProtection` order |
| Valuation flat | Shared Nifty/Sensex field | Use separate `niftyLevel` / `sensexLevel` |
| Dropdown hidden | Panel overflow | Portal-based `ProductCombobox` |

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| Z | Underlying performance vs entry (decimal) |
| Non-PP | Non-principal-protected; partial downside protection |
| Val date | Anchor date for mark-to-market (31-May-26 reference) |
| Working sheet | Hidden valuation grid in Excel; logic in TS engines |
| Seed | Baked JSON snapshot for fast dev/prod bootstrap |

---

*Document version: Primary-only · SP Dashboard · expanded reference.*

## 15. Column Encyclopedia (Primary Sheet)


### Month

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Month** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Month']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Month** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Month** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Month**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Trade Date/Opening date

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Trade Date/Opening date** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Trade Date/Opening date']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Trade Date/Opening date** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Trade Date/Opening date** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Trade Date/Opening date**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Name on Signup Form

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Name on Signup Form** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Name on Signup Form']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Name on Signup Form** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Name on Signup Form** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Name on Signup Form**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Underlying

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Underlying** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Underlying']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Underlying** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Underlying** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Underlying**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Series

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Series** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Series']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Series** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Series** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Series**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Issuer

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Issuer** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Issuer']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Issuer** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Issuer** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Issuer**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### ISIN No.

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **ISIN No.** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['ISIN No.']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **ISIN No.** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **ISIN No.** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **ISIN No.**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Actual Entry Level

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Actual Entry Level** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Actual Entry Level']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Actual Entry Level** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Actual Entry Level** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Actual Entry Level**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Target Nifty

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Target Nifty** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Target Nifty']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Target Nifty** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Target Nifty** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Target Nifty**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Average 1

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Average 1** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Average 1']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Average 1** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Average 1** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Average 1**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 2

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 2** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 2']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 2** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 2** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 2**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 3

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 3** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 3']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 3** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 3** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 3**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 4

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 4** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 4']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 4** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 4** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 4**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 5

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 5** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 5']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 5** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 5** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 5**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 6

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 6** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 6']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 6** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 6** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 6**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Avg. 7

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Avg. 7** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Avg. 7']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Avg. 7** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Avg. 7** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Avg. 7**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Observation Months

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Observation Months** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Observation Months']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Observation Months** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Observation Months** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Observation Months**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Last Observation Date

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Last Observation Date** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Last Observation Date']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Last Observation Date** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Last Observation Date** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Last Observation Date**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Trade Amount

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Trade Amount** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Trade Amount']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Trade Amount** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Trade Amount** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Trade Amount**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Maturity

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Maturity** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Maturity']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Maturity** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Maturity** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Maturity**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Product Type

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Product Type** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Product Type']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Product Type** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Product Type** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Product Type**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Principal Protection

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Principal Protection** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Principal Protection']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Principal Protection** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Principal Protection** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Principal Protection**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Listing

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Listing** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Listing']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Listing** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Listing** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Listing**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Formulae

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Formulae** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Formulae']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Formulae** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Formulae** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Formulae**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Product Explanation

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Product Explanation** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Product Explanation']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Product Explanation** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Product Explanation** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Product Explanation**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Allotment Date

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Allotment Date** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Allotment Date']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Allotment Date** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Allotment Date** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Allotment Date**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### POED

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **POED** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['POED']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **POED** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **POED** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **POED**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Coupon / PR / DM

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Coupon / PR / DM** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Coupon / PR / DM']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Coupon / PR / DM** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Coupon / PR / DM** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Coupon / PR / DM**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Coupon (%)

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Coupon (%)** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Coupon (%)']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Coupon (%)** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Coupon (%)** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Coupon (%)**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Tenor

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Tenor** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Tenor']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Tenor** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Tenor** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Tenor**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### price per debenture

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **price per debenture** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['price per debenture']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **price per debenture** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **price per debenture** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **price per debenture**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Classification based on tenor

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Classification based on tenor** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Classification based on tenor']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Classification based on tenor** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Classification based on tenor** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Classification based on tenor**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Arranger Fees (%)

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Arranger Fees (%)** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Arranger Fees (%)']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Arranger Fees (%)** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Arranger Fees (%)** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Arranger Fees (%)**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Upfront fees (%)

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Upfront fees (%)** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Upfront fees (%)']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Upfront fees (%)** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Upfront fees (%)** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Upfront fees (%)**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Arranger Fees (Rs.)

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Arranger Fees (Rs.)** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Arranger Fees (Rs.)']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Arranger Fees (Rs.)** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Arranger Fees (Rs.)** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Arranger Fees (Rs.)**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.


### Upfront fees (Rs.)

This field appears on every valid Primary row in `New Product Master_.xlsx`. Analysts use **Upfront fees (Rs.)** when reviewing trade tickets, client statements, or payoff confirmations. In the SP Dashboard, the value is ingested by `parser.ts` via header alias matching (`TARGET_HEADERS`) and stored on `ProductRecord.raw['Upfront fees (Rs.)']` at minimum. Typed fields (name, ISIN, formula, etc.) lift the most decision-critical columns into strongly-typed properties so React pages can bind inputs and KPIs without dynamic key lookups.

When **Upfront fees (Rs.)** changes in a reuploaded master, the bootstrap pipeline recomputes category summaries, lifecycle partitions, and formula catalogs automatically. Empty **Upfront fees (Rs.)** cells are allowed unless the column is required for identity (`Name on Signup Form`) or payoff (`Formulae`). Validation warnings surface missing key headers but never silently coerce blank cells into zero — a deliberate choice to mirror Excel’s visible empties.

Desk tip: if client-facing copy references **Upfront fees (Rs.)**, verify the same header string exists in row 2 of the Primary sheet; renamed headers break alias resolution until `TARGET_HEADERS` is extended.

