/**
 * Audit Analytics Lab (ScienceLab) chart numbers vs master Excel.
 * Usage: npx tsx scripts/verify-analytics-plots.ts [ongoing|expired|expiring-3m|expiring-1m]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getCouponDistribution,
  getLifecycleChartData,
  getProtectionMix,
  getTenorDistribution,
  getUnderlyingExposure,
} from "../lib/analytics";
import {
  filterProductsByLifecycle,
  filterValidMasterProducts,
  getProductLifecycleStatus,
  LIFECYCLE_FILTERS,
  type LifecycleFilter,
} from "../lib/product-lifecycle";
import { classifyProtection, getCouponPercent } from "../lib/product-utils";
import type { ProductRecord } from "../lib/types";
import { formatCrores, formatNumber, formatPercent } from "../lib/utils";
import { parseWorkbookBuffer } from "../lib/workbook/parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKBOOK = join(ROOT, "New Product Master_.xlsx");
const SEED = join(ROOT, "lib", "data", "master-seed.json");

function loadProducts(): ProductRecord[] {
  if (existsSync(WORKBOOK)) {
    const file = readFileSync(WORKBOOK);
    const buf = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    return parseWorkbookBuffer(buf, "New Product Master_.xlsx").products;
  }
  return (JSON.parse(readFileSync(SEED, "utf8")) as { products: ProductRecord[] }).products;
}

function crores(n: number) {
  return formatCrores(n);
}

function auditFilter(filter: LifecycleFilter, asOf: Date) {
  const all = loadProducts();
  const master = filterValidMasterProducts(all, asOf);
  const pool = filterProductsByLifecycle(master, filter, asOf);

  const aum = pool.reduce((s, p) => s + (p.tradeAmount ?? 0), 0);
  const coupons = pool.map((p) => getCouponPercent(p)).filter((x): x is number => x !== undefined);
  const avgCoupon = coupons.length ? coupons.reduce((a, b) => a + b, 0) / coupons.length : 0;

  const lifecycle = getLifecycleChartData(pool, asOf);
  const couponDist = getCouponDistribution(pool);
  const protection = getProtectionMix(pool);
  const underlyings = getUnderlyingExposure(pool).slice(0, 3);
  const tenor = getTenorDistribution(pool, asOf);

  const statusBreakdown = new Map<string, { count: number; notional: number }>();
  for (const p of pool) {
    const st = getProductLifecycleStatus(p, asOf);
    const cur = statusBreakdown.get(st) ?? { count: 0, notional: 0 };
    cur.count += 1;
    cur.notional += p.tradeAmount ?? 0;
    statusBreakdown.set(st, cur);
  }

  const couponSum = couponDist.reduce((s, b) => s + b.value, 0);
  const protectionSum = protection.reduce((s, b) => s + b.value, 0);
  const tenorSum = tenor.reduce((s, b) => s + b.value, 0);
  const underlyingSum = underlyings.reduce((s, b) => s + b.value, 0);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`ANALYTICS LAB AUDIT · ${filter.toUpperCase()} · as of ${asOf.toLocaleString("en-IN")}`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\n--- Pool (valid Primary master only) ---`);
  console.log(`  Products:     ${formatNumber(pool.length)}`);
  console.log(`  AUM:          ${crores(aum)}  (raw ₹${aum.toLocaleString("en-IN")})`);
  console.log(`  Avg coupon:   ${formatPercent(avgCoupon)}  (n=${coupons.length})`);
  console.log(`  Excluded:     ${formatNumber(all.length - master.length)} invalid/unknown rows`);

  console.log(`\n--- 1. LIFECYCLE UNIVERSE (pie legend) ---`);
  for (const entry of lifecycle.filter((e) => e.count > 0)) {
    console.log(`  ${entry.label}: ${formatNumber(entry.count)} · ${crores(entry.notional)}`);
  }
  console.log(`  Status within tab:`);
  for (const [st, v] of statusBreakdown) {
    console.log(`    ${st}: ${formatNumber(v.count)} · ${crores(v.notional)}`);
  }

  console.log(`\n--- 2. COUPON DISTRIBUTION (AUM-weighted notional by bucket) ---`);
  for (const row of couponDist) {
    const pct = aum > 0 ? ((row.value / aum) * 100).toFixed(1) : "0";
    console.log(`  ${row.bucket.padEnd(12)} ${crores(row.value).padStart(14)}  (${pct}% of tab AUM)`);
  }
  console.log(`  Bucket sum:   ${crores(couponSum)}  match AUM: ${Math.abs(couponSum - aum) < 1 ? "YES" : "NO Δ" + crores(couponSum - aum)}`);

  console.log(`\n--- 3. PRINCIPAL PROTECTION MIX ---`);
  for (const row of protection) {
    const pct = aum > 0 ? ((row.value / aum) * 100).toFixed(1) : "0";
    console.log(`  ${row.name.padEnd(22)} ${crores(row.value).padStart(14)}  (${pct}%)`);
  }
  const protectedCount = pool.filter((p) => classifyProtection(p.principalProtection) === "protected").length;
  const exposedCount = pool.filter((p) => classifyProtection(p.principalProtection) === "exposed").length;
  console.log(`  Counts: protected=${protectedCount}, exposed=${exposedCount}, unclassified=${pool.length - protectedCount - exposedCount}`);
  console.log(`  Mix sum:      ${crores(protectionSum)}  match AUM: ${Math.abs(protectionSum - aum) < 1 ? "YES" : "NO"}`);

  console.log(`\n--- 4. UNDERLYING EXPOSURE · TOP 3 ---`);
  for (const row of underlyings) {
    const pct = aum > 0 ? ((row.value / aum) * 100).toFixed(1) : "0";
    console.log(`  ${(row.underlying ?? "Other").padEnd(20)} ${crores(row.value).padStart(14)}  (${pct}%)`);
  }
  const allUnder = getUnderlyingExposure(pool);
  console.log(`  Top-3 cover:  ${crores(underlyingSum)} of ${crores(aum)} (${aum > 0 ? ((underlyingSum / aum) * 100).toFixed(1) : 0}%)`);
  if (allUnder.length > 3) {
    console.log(`  #4+: ${allUnder.slice(3, 6).map((u) => `${u.underlying} ${crores(u.value)}`).join(", ")}`);
  }

  console.log(`\n--- 5. TENOR PROFILE ---`);
  for (const row of tenor.filter((t) => t.value > 0)) {
    const pct = aum > 0 ? ((row.value / aum) * 100).toFixed(1) : "0";
    console.log(`  ${row.bucket.padEnd(10)} ${crores(row.value).padStart(14)}  (${pct}%)`);
  }
  console.log(`  Tenor sum:    ${crores(tenorSum)}  match AUM: ${Math.abs(tenorSum - aum) < 1 ? "YES" : "NO Δ" + crores(tenorSum - aum)}`);

  return { pool: pool.length, aum, lifecycle, couponDist, protection, underlyings, tenor };
}

const filterArg = (process.argv[2] as LifecycleFilter | undefined) ?? "ongoing";
const filters = LIFECYCLE_FILTERS.includes(filterArg as LifecycleFilter) ? [filterArg as LifecycleFilter] : [...LIFECYCLE_FILTERS];

console.log("Loading master products…");
const asOf = new Date();

for (const f of filters) {
  auditFilter(f, asOf);
}

if (filters.includes("ongoing") || filterArg === "ongoing") {
  console.log(`\n${"=".repeat(60)}`);
  console.log("USER UI CROSS-CHECK (Ongoing tab)");
  console.log(`${"=".repeat(60)}`);
  const master = filterValidMasterProducts(loadProducts(), asOf);
  const pool = filterProductsByLifecycle(master, "ongoing", asOf);
  const aum = pool.reduce((s, p) => s + (p.tradeAmount ?? 0), 0);
  const lifecycle = getLifecycleChartData(pool, asOf);
  const ongoingSlice = lifecycle.find((e) => e.status === "ongoing");
  console.log(`\n  UI reported:  Ongoing · 2263 · ₹24,838.36 Cr`);
  console.log(`  Engine now:   Ongoing · ${formatNumber(ongoingSlice?.count ?? 0)} · ${crores(ongoingSlice?.notional ?? 0)}`);
  console.log(`  Tab pool:     ${formatNumber(pool.length)} products · ${crores(aum)}`);
  const countOk = ongoingSlice?.count === 2263 || ongoingSlice?.count === pool.length;
  console.log(`  Note: Pie shows status "ongoing" count (${ongoingSlice?.count}), tab pool (${pool.length}) includes perpetual if any.`);
}
