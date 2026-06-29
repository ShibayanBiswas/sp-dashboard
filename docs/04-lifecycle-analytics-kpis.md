# Lifecycle Analytics KPIs

The **Lifecycle Category Analytics** panel (Home + Analytics Lab) shows four KPIs per tab: **Ongoing**, **Expiring in 3M**, **Expiring in 1M**, **Expired**.

Implementation: `components/analytics/lifecycle-lab.tsx`  
Shared logic with Science Lab when the same lifecycle tab is selected.

---

## Ongoing bucket — who is included?

`filterProductsByLifecycle(products, "ongoing", asOf)` in `lib/product-lifecycle.ts`:

| Lifecycle status | In Ongoing tab? |
|------------------|-----------------|
| `ongoing` (maturity > 90 days away) | Yes |
| `perpetual` | Yes |
| `unknown` (no maturity on file) | Yes |
| `expiring-1m` / `expiring-3m` | **No** — use Expiring tabs |
| `expired` | No |
| `upcoming` (trade date in future) | No |

**Product count** = length of filtered pool.  
**Updated time** = `usePortfolioClock().asOf` (refreshes every 60s).

---

## KPI definitions (verified 29-Jun-2026)

Run audit anytime:

```bash
npm run verify:kpis ongoing
npm run verify:kpis          # all four buckets
```

### 1. AUM — ₹24,840.36 Cr

```typescript
aum = pool.reduce((sum, p) => sum + (p.tradeAmount ?? 0), 0);
display = formatCrores(aum);  // ÷ 1e7, 2 decimal places
```

| Field | Excel column | Notes |
|-------|--------------|-------|
| `tradeAmount` | **Trade Amount** | Parsed as number (commas stripped) |

**Raw sum (Ongoing):** ₹2,48,40,35,86,777.04 → **₹24,840.36 Cr**

**Not** debenture price × count — book AUM is trade notional from master.

---

### 2. Avg Coupon — 96.7%

```typescript
coupons = pool.map(getCouponPercent).filter(isFinite);
avgCoupon = sum(coupons) / coupons.length;  // arithmetic mean
display = formatPercent(avgCoupon);         // decimal × 100, 1 dp
```

| Source | Priority |
|--------|----------|
| `product.couponPercent` | 1 |
| Raw **Coupon (%)** | 2 |
| Raw **Coupon / PR / DM** or **Product return** | 3 |

**Ongoing audit:** 2,266 products with coupon, **35 missing** (excluded from average).

Internal decimal **0.9671** → display **96.7%**.

> This is **average headline coupon** across products with a parseable coupon — not AUM-weighted.

---

### 3. Listed — 0.5%

```typescript
listedShare = listedCount / pool.length;
listedCount = pool.filter(p => p.listing?.toLowerCase() === "listed").length;
display = formatPercent(listedShare);
```

**Ongoing:** **11** listed of **2,301** → 0.478% → rounds to **0.5%**.

Excel column: **Listing** (`Listed` / `Unlisted`).

---

### 4. Protected — 0.0%

```typescript
protectedShare = protectedCount / pool.length;
protectedCount = pool.filter(p => classifyProtection(p.principalProtection) === "protected").length;
```

`classifyProtection()` in `lib/product-utils.ts`:

1. Empty → `unknown` (not counted as protected)
2. Contains **"non"**, **"npp"** → `exposed`
3. Contains **"principal protected"**, **"capital guarantee"**, **"pp"** → `protected`

**Ongoing:** **1** protected of **2,301** → 0.043% → displays **0.0%** (1 decimal).

Excel column: **Principal Protection**.

Primary book is almost entirely **Non-Principal Protected** → Protected ≈ 0% is expected.

---

## All lifecycle buckets (29-Jun-2026)

| Bucket | Products | AUM (Cr) | Avg Coupon | Listed | Protected |
|--------|----------|----------|------------|--------|-----------|
| Ongoing | 2,301 | 24,840.36 | 96.7% | 0.5% (11) | 0.0% (1) |
| Expiring 3M | 108 | 797.00 | 74.9% | 0.0% (0) | 0.0% (0) |
| Expiring 1M | 46 | 337.15 | 73.6% | 0.0% (0) | 0.0% (0) |
| Expired | 2,124 | 10,828.41 | 62.5% | 5.3% (113) | 5.5% (117) |

Run `npm run verify:kpis` to regenerate from current master + clock.

---

## UI vs headline Home KPIs

| Location | What it shows |
|----------|----------------|
| **Lifecycle Category Analytics** | KPIs for **selected tab only** |
| **Home top band** (Live Notional, Ongoing count, …) | **Whole book** via `getPortfolioHeadlineStats()` |

Ongoing **count** on Home uses `getLifecycleNotional()` status `ongoing` only (excludes perpetual/unknown from strict ongoing status but filter includes them — see note below).

**Count discrepancy:** UI tab "Ongoing" = 2,301 includes perpetual + unknown. Strict status `ongoing` in partition may differ slightly; the **tab filter** is authoritative for the analytics panel.

---

## When KPIs look wrong

| Symptom | Check |
|---------|-------|
| AUM off after upload | Re-upload master; confirm **Trade Amount** column parsed |
| Avg Coupon 0% or NaN | Missing **Coupon (%)** on many rows — run `verify:kpis` for `withoutCoupon` |
| Listed always 0% | **Listing** column spelling must be exactly `Listed` (case-insensitive) |
| Protected wrong | **Non-Principal Protected** must not match before **Principal Protected** — see `classifyProtection` order |
| Stale timestamp | `usePortfolioClock` — wait 60s or change system date |
| Tab doesn't match list | Same `filter` prop must be passed to `LifecycleProductList` and `LifecycleAnalyticsGrid` |

---

## Code references

```
lib/product-lifecycle.ts     → filterProductsByLifecycle, getProductLifecycleStatus
lib/product-utils.ts         → getCouponPercent, classifyProtection
lib/utils.ts                 → formatCrores, formatPercent
components/analytics/lifecycle-lab.tsx
scripts/verify-lifecycle-kpis.ts
```
