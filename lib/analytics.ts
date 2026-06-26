import { differenceInCalendarDays, format } from "date-fns";

import type { DashboardDataset, ProductCategory, ProductRecord } from "@/lib/types";
import { getLifecycleNotional, partitionByLifecycle, type LifecycleStatus } from "@/lib/product-lifecycle";
import { classifyProtection, getCouponPercent } from "@/lib/product-utils";
import { parseExcelishDate } from "@/lib/workbook/dates";

export function getPortfolioHeadlineStats(dataset: DashboardDataset) {
  const liveNotional = dataset.products.reduce((sum, product) => sum + (product.tradeAmount ?? 0), 0);
  const coupons = dataset.products
    .map((product) => getCouponPercent(product))
    .filter((c): c is number => c !== undefined);
  const averageCoupon = coupons.length > 0 ? coupons.reduce((sum, c) => sum + c, 0) / coupons.length : 0;

  const listed = dataset.products.filter((product) => product.listing?.toLowerCase() === "listed").length;
  const protectedCount = dataset.products.filter(
    (product) => classifyProtection(product.principalProtection) === "protected",
  ).length;

  const maturingSoon = dataset.products.filter((product) => {
    const parsed = parseExcelishDate(product.maturityRaw);
    if (!parsed) {
      return false;
    }
    const diff = differenceInCalendarDays(parsed, new Date());
    return diff >= 0 && diff <= 90;
  }).length;

  const lifecycle = getLifecycleNotional(dataset.products);
  const statusCount = (status: LifecycleStatus) => lifecycle.find((e) => e.status === status)?.count ?? 0;
  const statusNotional = (status: LifecycleStatus) => lifecycle.find((e) => e.status === status)?.notional ?? 0;

  const ongoingCount = statusCount("ongoing");
  const expiredCount = statusCount("expired");
  const perpetualCount = statusCount("perpetual");
  const unknownCount = statusCount("unknown");

  // Active / live book = everything that has NOT matured and is not a future-dated upcoming trade.
  // This mirrors the "Live Book" lifecycle filter (ongoing + maturing-soon + perpetual + unknown).
  const maturingSoonStatus = statusCount("maturing-soon");
  const activeCount = ongoingCount + maturingSoonStatus + perpetualCount + unknownCount;
  const activeNotional =
    statusNotional("ongoing") +
    statusNotional("maturing-soon") +
    statusNotional("perpetual") +
    statusNotional("unknown");

  return {
    liveNotional,
    totalProducts: dataset.products.length,
    averageCoupon,
    listedShare: dataset.products.length > 0 ? listed / dataset.products.length : 0,
    protectedShare: dataset.products.length > 0 ? protectedCount / dataset.products.length : 0,
    maturingSoon,
    activeCount,
    activeNotional,
    ongoingCount,
    expiredCount,
    perpetualCount,
    unknownCount,
    ongoingNotional: statusNotional("ongoing"),
    expiredNotional: statusNotional("expired"),
  };
}

export function getMaturityLadder(products: ProductRecord[]) {
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
    const days = differenceInCalendarDays(maturity, new Date());
    if (days <= 90) {
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

export function getIssuerHeatmap(dataset: DashboardDataset) {
  const issuerMap = new Map<string, Record<ProductCategory, number>>();
  for (const product of dataset.products) {
    const issuer = product.issuer || "Unknown issuer";
    if (!issuerMap.has(issuer)) {
      issuerMap.set(issuer, { Primary: 0 });
    }
    issuerMap.get(issuer)![product.category] += product.tradeAmount ?? 0;
  }

  return [...issuerMap.entries()]
    .map(([issuer, exposures]) => ({ issuer, ...exposures }))
    .sort((a, b) => b.Primary - a.Primary)
    .slice(0, 8);
}

export function getCategoryRiskNotes(dataset: DashboardDataset) {
  return dataset.categorySummaries.map((summary) => ({
    category: summary.category,
    note:
      summary.principalProtectedShare < 0.35
        ? "Higher downside sensitivity due to a lower principal-protected mix."
        : summary.listedShare < 0.5
          ? "Liquidity may depend on unlisted structures and issuer exits."
          : "Relatively cleaner liquidity profile with more listed structures.",
  }));
}

export function getProductTimeline(products: ProductRecord[]) {
  return products
    .map((product) => ({
      product: product.name,
      category: product.category,
      maturity: parseExcelishDate(product.maturityRaw),
      displayDate: product.maturityRaw
        ? product.maturityRaw
        : product.lastObservationDateRaw
          ? product.lastObservationDateRaw
          : "Unknown",
      tradeAmount: product.tradeAmount ?? 0,
    }))
    .sort((a, b) => {
      if (!a.maturity && !b.maturity) {
        return b.tradeAmount - a.tradeAmount;
      }
      if (!a.maturity) {
        return 1;
      }
      if (!b.maturity) {
        return -1;
      }
      return a.maturity.getTime() - b.maturity.getTime();
    })
    .slice(0, 10)
    .map((item) => ({
      ...item,
      maturityLabel: item.maturity ? format(item.maturity, "dd MMM yyyy") : item.displayDate,
    }));
}

const LIFECYCLE_COLORS: Record<LifecycleStatus, string> = {
  ongoing: "#22d3ee",
  expired: "#64748b",
  perpetual: "#facc15",
  upcoming: "#a855f7",
  "maturing-soon": "#fb7185",
  unknown: "#475569",
};

export function getLifecycleChartData(products: ProductRecord[]) {
  return getLifecycleNotional(products).map((entry) => ({
    ...entry,
    label: entry.status.replace("-", " "),
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

export function getCategoryRadar(dataset: DashboardDataset) {
  return dataset.categorySummaries.map((summary) => ({
    category: summary.category,
    notional: summary.liveNotional / 1e7,
    coupon: summary.averageCoupon * 10,
    listed: summary.listedShare * 100,
    protected: summary.principalProtectedShare * 100,
    depth: summary.productCount / 10,
  }));
}

export function getNotionalScatter(products: ProductRecord[]) {
  return products
    .filter((p) => p.tradeAmount && p.couponPercent !== undefined)
    .slice(0, 120)
    .map((p) => ({
      name: p.name.slice(0, 20),
      notional: (p.tradeAmount ?? 0) / 1e7,
      coupon: p.couponPercent ?? 0,
      category: p.category,
    }));
}

export function getExpiredVsOngoingTable(products: ProductRecord[]) {
  const buckets = partitionByLifecycle(products);
  return (["ongoing", "upcoming", "maturing-soon", "expired", "perpetual", "unknown"] as LifecycleStatus[]).map((status) => {
    const pool = buckets[status];
    const coupons = pool.map((p) => getCouponPercent(p)).filter((c): c is number => c !== undefined);
    return {
      status,
      count: pool.length,
      notional: pool.reduce((s, p) => s + (p.tradeAmount ?? 0), 0),
      avgCoupon: coupons.length > 0 ? coupons.reduce((s, c) => s + c, 0) / coupons.length : 0,
    };
  });
}
