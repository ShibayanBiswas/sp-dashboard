import { differenceInCalendarDays } from "date-fns";

import type { ProductRecord } from "@/lib/types";
import { rawField } from "@/lib/product-utils";
import { parseExcelishDate } from "@/lib/workbook/dates";

/** Calendar-day horizons — labelled as months in the UI. */
export const EXPIRING_1M_DAYS = 30;
export const EXPIRING_3M_DAYS = 90;

export type LifecycleStatus =
  | "ongoing"
  | "expired"
  | "perpetual"
  | "expiring-1m"
  | "expiring-3m"
  | "unknown"
  | "upcoming";

export const LIFECYCLE_FILTERS = ["ongoing", "expired", "expiring-3m", "expiring-1m"] as const;

export type LifecycleFilter = (typeof LIFECYCLE_FILTERS)[number];

export const LIFECYCLE_FILTER_LABELS: Record<LifecycleFilter, string> = {
  ongoing: "Ongoing",
  expired: "Expired",
  "expiring-3m": "Expiring in 3M",
  "expiring-1m": "Expiring in 1M",
};

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  ongoing: "Ongoing",
  expired: "Expired",
  perpetual: "Perpetual",
  "expiring-1m": "Expiring in 1M",
  "expiring-3m": "Expiring in 3M",
  unknown: "Unknown",
  upcoming: "Upcoming",
};

function getTradeOrAllotmentDate(product: ProductRecord): Date | null {
  return (
    parseExcelishDate(String(rawField(product, "Trade Date/Opening date", "Allotment Date", "Trade Date") ?? "")) ??
    null
  );
}

export function getProductLifecycleStatus(product: ProductRecord, asOf = new Date()): LifecycleStatus {
  const perpetual =
    product.name.toLowerCase().includes("perpetual") ||
    String(rawField(product, "Maturity", "Maturity date", "Product Type") ?? "")
      .toLowerCase()
      .includes("perpetual");

  if (perpetual) return "perpetual";

  const tradeDate = getTradeOrAllotmentDate(product);
  if (tradeDate && differenceInCalendarDays(tradeDate, asOf) > 0) {
    return "upcoming";
  }

  const maturity = parseExcelishDate(product.maturityRaw);
  const lastObs = parseExcelishDate(product.lastObservationDateRaw);
  const anchor = maturity ?? lastObs;

  if (!anchor) return "unknown";

  const days = differenceInCalendarDays(anchor, asOf);
  if (days < 0) return "expired";
  if (days <= EXPIRING_1M_DAYS) return "expiring-1m";
  if (days <= EXPIRING_3M_DAYS) return "expiring-3m";
  return "ongoing";
}

export function getDaysToMaturity(product: ProductRecord, asOf = new Date()): number | undefined {
  const maturity = parseExcelishDate(product.maturityRaw);
  const lastObs = parseExcelishDate(product.lastObservationDateRaw);
  const anchor = maturity ?? lastObs;
  if (!anchor) return undefined;
  return differenceInCalendarDays(anchor, asOf);
}

/** Primary master rows with parseable lifecycle and finite notional — excludes unknown / NaN. */
export function isValidMasterProduct(product: ProductRecord, asOf = new Date()): boolean {
  if (product.category !== "Primary") return false;
  const notional = product.tradeAmount;
  if (notional == null || !Number.isFinite(notional) || notional <= 0) return false;
  return getProductLifecycleStatus(product, asOf) !== "unknown";
}

export function filterValidMasterProducts(products: ProductRecord[], asOf = new Date()): ProductRecord[] {
  return products.filter((product) => isValidMasterProduct(product, asOf));
}

/** Live marks apply only to non-expired, non-upcoming products. */
export function isValuationApplicable(product: ProductRecord, asOf = new Date()): boolean {
  const status = getProductLifecycleStatus(product, asOf);
  return status !== "expired" && status !== "upcoming";
}

export function filterProductsByLifecycle(
  products: ProductRecord[],
  filter: LifecycleFilter,
  asOf = new Date(),
): ProductRecord[] {
  return products.filter((product) => lifecycleStatusMatchesFilter(getProductLifecycleStatus(product, asOf), filter));
}

/** Whether a granular lifecycle status belongs to a UI tab bucket. */
export function lifecycleStatusMatchesFilter(status: LifecycleStatus, filter: LifecycleFilter): boolean {
  if (filter === "ongoing") {
    return status === "ongoing" || status === "perpetual";
  }
  if (filter === "expired") return status === "expired";
  if (filter === "expiring-1m") return status === "expiring-1m";
  if (filter === "expiring-3m") return status === "expiring-1m" || status === "expiring-3m";
  return false;
}

export function countProductsByLifecycleFilter(
  products: ProductRecord[],
  filter: LifecycleFilter,
  asOf = new Date(),
): number {
  return filterProductsByLifecycle(products, filter, asOf).length;
}

export function partitionByLifecycle(products: ProductRecord[], asOf = new Date()) {
  const buckets: Record<LifecycleStatus, ProductRecord[]> = {
    ongoing: [],
    expired: [],
    perpetual: [],
    "expiring-1m": [],
    "expiring-3m": [],
    unknown: [],
    upcoming: [],
  };

  for (const product of products) {
    buckets[getProductLifecycleStatus(product, asOf)].push(product);
  }

  return buckets;
}

export function getLifecycleNotional(products: ProductRecord[], asOf = new Date()) {
  const buckets = partitionByLifecycle(products, asOf);
  return (Object.keys(buckets) as LifecycleStatus[]).map((status) => ({
    status,
    count: buckets[status].length,
    notional: buckets[status].reduce((sum, p) => sum + (p.tradeAmount ?? 0), 0),
  }));
}
