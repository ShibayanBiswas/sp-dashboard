import { differenceInCalendarDays } from "date-fns";

import type { DashboardDataset, ProductRecord } from "@/lib/types";
import {
  EXPIRING_1M_DAYS,
  EXPIRING_3M_DAYS,
  countProductsByLifecycleFilter,
  filterProductsByLifecycle,
  getLifecycleNotional,
  LIFECYCLE_FILTERS,
  LIFECYCLE_STATUS_LABELS,
  partitionByLifecycle,
  type LifecycleFilter,
  type LifecycleStatus,
} from "@/lib/product-lifecycle";
import { classifyProtection, getCouponPercent } from "@/lib/product-utils";
import { parseExcelishDate } from "@/lib/workbook/dates";

export function getPortfolioHeadlineStats(dataset: DashboardDataset, asOf = new Date()) {
  const liveNotional = dataset.products.reduce((sum, product) => sum + (product.tradeAmount ?? 0), 0);
  const coupons = dataset.products
    .map((product) => getCouponPercent(product))
    .filter((c): c is number => c !== undefined);
  const averageCoupon = coupons.length > 0 ? coupons.reduce((sum, c) => sum + c, 0) / coupons.length : 0;

  const listed = dataset.products.filter((product) => product.listing?.toLowerCase() === "listed").length;
  const protectedCount = dataset.products.filter(
    (product) => classifyProtection(product.principalProtection) === "protected",
  ).length;

  const maturingSoon = countProductsByLifecycleFilter(dataset.products, "expiring-3m", asOf);
  const expiring1m = countProductsByLifecycleFilter(dataset.products, "expiring-1m", asOf);

  const lifecycle = getLifecycleNotional(dataset.products, asOf);
  const statusCount = (status: LifecycleStatus) => lifecycle.find((e) => e.status === status)?.count ?? 0;
  const statusNotional = (status: LifecycleStatus) => lifecycle.find((e) => e.status === status)?.notional ?? 0;

  const ongoingCount = countProductsByLifecycleFilter(dataset.products, "ongoing", asOf);
  const expiredCount = countProductsByLifecycleFilter(dataset.products, "expired", asOf);
  const perpetualCount = statusCount("perpetual");
  const unknownCount = statusCount("unknown");

  // Active / live book = everything that has NOT matured and is not a future-dated upcoming trade.
  // This mirrors the "Live Book" lifecycle filter (ongoing + maturing-soon + perpetual + unknown).
  // Live book = Ongoing tab + Expiring tab (disjoint buckets).
  const activeCount = ongoingCount + maturingSoon;
  const ongoingTabNotional = filterProductsByLifecycle(dataset.products, "ongoing", asOf).reduce(
    (s, p) => s + (p.tradeAmount ?? 0),
    0,
  );
  const expiringTabNotional = filterProductsByLifecycle(dataset.products, "expiring-3m", asOf).reduce(
    (s, p) => s + (p.tradeAmount ?? 0),
    0,
  );
  const activeNotional = ongoingTabNotional + expiringTabNotional;

  return {
    liveNotional,
    totalProducts: dataset.products.length,
    averageCoupon,
    listedShare: dataset.products.length > 0 ? listed / dataset.products.length : 0,
    protectedShare: dataset.products.length > 0 ? protectedCount / dataset.products.length : 0,
    maturingSoon,
    expiring1m,
    activeCount,
    activeNotional,
    ongoingCount,
    expiredCount,
    perpetualCount,
    unknownCount,
    tabCounts: Object.fromEntries(
      LIFECYCLE_FILTERS.map((key) => [key, countProductsByLifecycleFilter(dataset.products, key, asOf)]),
    ) as Record<LifecycleFilter, number>,
    ongoingNotional: statusNotional("ongoing"),
    expiredNotional: statusNotional("expired"),
  };
}

export function getMaturityLadder(products: ProductRecord[], asOf = new Date()) {
  const buckets = new Map<string, number>([
    ["0-3M", 0],
    ["3-6M", 0],
    ["6-12M", 0],
    ["12M+", 0],
    ["Unknown", 0],
  ]);

  for (const product of products) {
    const maturity = parseExcelishDate(product.maturityRaw);
    if (!maturity) {
      buckets.set("Unknown", (buckets.get("Unknown") ?? 0) + (product.tradeAmount ?? 0));
      continue;
    }
    const days = differenceInCalendarDays(maturity, asOf);
    if (days <= EXPIRING_3M_DAYS) {
      buckets.set("0-3M", (buckets.get("0-3M") ?? 0) + (product.tradeAmount ?? 0));
    } else if (days <= 180) {
      buckets.set("3-6M", (buckets.get("3-6M") ?? 0) + (product.tradeAmount ?? 0));
    } else if (days <= 365) {
      buckets.set("6-12M", (buckets.get("6-12M") ?? 0) + (product.tradeAmount ?? 0));
    } else {
      buckets.set("12M+", (buckets.get("12M+") ?? 0) + (product.tradeAmount ?? 0));
    }
  }

  return [...buckets.entries()].map(([bucket, value]) => ({ bucket, value }));
}

const LIFECYCLE_COLORS: Record<LifecycleStatus, string> = {
  ongoing: "#22d3ee",
  expired: "#64748b",
  perpetual: "#facc15",
  upcoming: "#a855f7",
  "expiring-1m": "#fb7185",
  "expiring-3m": "#f97316",
  unknown: "#475569",
};

export function getLifecycleChartData(products: ProductRecord[], asOf = new Date()) {
  return getLifecycleNotional(products, asOf)
    .filter((entry) => entry.status !== "unknown" && entry.count > 0)
    .map((entry) => ({
    ...entry,
    label: LIFECYCLE_STATUS_LABELS[entry.status],
    color: LIFECYCLE_COLORS[entry.status],
  }));
}

export function getCouponDistribution(products: ProductRecord[]) {
  const buckets = new Map<string, number>([
    ["0-5%", 0],
    ["5-10%", 0],
    ["10-15%", 0],
    ["15%+", 0],
    ["No coupon", 0],
  ]);

  for (const product of products) {
    const coupon = getCouponPercent(product);
    const weight = product.tradeAmount ?? 1;
    const couponPct = coupon === undefined ? undefined : coupon * 100;
    if (couponPct === undefined || couponPct === 0) {
      buckets.set("No coupon", (buckets.get("No coupon") ?? 0) + weight);
    } else if (couponPct < 5) {
      buckets.set("0-5%", (buckets.get("0-5%") ?? 0) + weight);
    } else if (couponPct < 10) {
      buckets.set("5-10%", (buckets.get("5-10%") ?? 0) + weight);
    } else if (couponPct < 15) {
      buckets.set("10-15%", (buckets.get("10-15%") ?? 0) + weight);
    } else {
      buckets.set("15%+", (buckets.get("15%+") ?? 0) + weight);
    }
  }

  return [...buckets.entries()].map(([bucket, value]) => ({ bucket, value }));
}

export function getProtectionMix(products: ProductRecord[]) {
  let protectedNotional = 0;
  let exposedNotional = 0;
  let unknown = 0;

  for (const product of products) {
    const n = product.tradeAmount ?? 0;
    const klass = classifyProtection(product.principalProtection);
    if (klass === "protected") {
      protectedNotional += n;
    } else if (klass === "exposed") {
      exposedNotional += n;
    } else {
      unknown += n;
    }
  }

  return [
    { name: "Principal Protected", value: protectedNotional, color: "#4ade80" },
    { name: "Capital at Risk", value: exposedNotional, color: "#fb7185" },
    { name: "Unclassified", value: unknown, color: "#64748b" },
  ].filter((e) => e.value > 0);
}

export function getUnderlyingExposure(products: ProductRecord[]) {
  const map = new Map<string, number>();
  for (const product of products) {
    const key = product.underlying?.trim() || "Other";
    map.set(key, (map.get(key) ?? 0) + (product.tradeAmount ?? 0));
  }
  return [...map.entries()]
    .map(([underlying, value]) => ({ underlying, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function getTenorDistribution(products: ProductRecord[]) {
  const buckets = new Map<string, number>([
    ["< 1Y", 0],
    ["1-2Y", 0],
    ["2-3Y", 0],
    ["3-5Y", 0],
    ["5Y+", 0],
    ["Unknown", 0],
  ]);

  for (const product of products) {
    const weight = product.tradeAmount ?? 1;
    const days = product.tenorDays;
    if (!days) {
      buckets.set("Unknown", (buckets.get("Unknown") ?? 0) + weight);
    } else if (days < 365) {
      buckets.set("< 1Y", (buckets.get("< 1Y") ?? 0) + weight);
    } else if (days < 730) {
      buckets.set("1-2Y", (buckets.get("1-2Y") ?? 0) + weight);
    } else if (days < 1095) {
      buckets.set("2-3Y", (buckets.get("2-3Y") ?? 0) + weight);
    } else if (days < 1825) {
      buckets.set("3-5Y", (buckets.get("3-5Y") ?? 0) + weight);
    } else {
      buckets.set("5Y+", (buckets.get("5Y+") ?? 0) + weight);
    }
  }

  return [...buckets.entries()].map(([bucket, value]) => ({ bucket, value }));
}

export function getExpiredVsOngoingTable(products: ProductRecord[], asOf = new Date()) {
  const buckets = partitionByLifecycle(products, asOf);
  const statusOrder: LifecycleStatus[] = [
    "ongoing",
    "expiring-3m",
    "expiring-1m",
    "upcoming",
    "expired",
    "perpetual",
  ];

  return statusOrder
    .map((status) => {
      const pool = buckets[status];
      const coupons = pool.map((p) => getCouponPercent(p)).filter((c): c is number => c !== undefined);
      return {
        status,
        count: pool.length,
        notional: pool.reduce((s, p) => s + (p.tradeAmount ?? 0), 0),
        avgCoupon: coupons.length > 0 ? coupons.reduce((s, c) => s + c, 0) / coupons.length : 0,
      };
    })
    .filter((row) => row.count > 0);
}

export function getLifecycleTableTotals(products: ProductRecord[], asOf = new Date()) {
  const coupons = products.map((p) => getCouponPercent(p)).filter((c): c is number => c !== undefined);
  return {
    count: products.length,
    notional: products.reduce((s, p) => s + (p.tradeAmount ?? 0), 0),
    avgCoupon: coupons.length > 0 ? coupons.reduce((s, c) => s + c, 0) / coupons.length : 0,
  };
}
