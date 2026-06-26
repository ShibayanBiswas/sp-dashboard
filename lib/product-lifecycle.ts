import { differenceInCalendarDays } from "date-fns";

import type { ProductRecord } from "@/lib/types";
import { rawField } from "@/lib/product-utils";
import { parseExcelishDate } from "@/lib/workbook/dates";

export type LifecycleStatus = "ongoing" | "expired" | "perpetual" | "maturing-soon" | "unknown" | "upcoming";

export type LifecycleFilter = "ongoing" | "expired" | "upcoming" | "all";

export const LIFECYCLE_FILTER_LABELS: Record<LifecycleFilter, string> = {
  ongoing: "Live Book",
  expired: "Expired",
  upcoming: "Upcoming",
  all: "All Products",
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
  if (days <= 90) return "maturing-soon";
  return "ongoing";
}

export function filterProductsByLifecycle(
  products: ProductRecord[],
  filter: LifecycleFilter,
  asOf = new Date(),
): ProductRecord[] {
  if (filter === "all") return products;

  return products.filter((product) => {
    const status = getProductLifecycleStatus(product, asOf);
    if (filter === "ongoing") {
      return status === "ongoing" || status === "perpetual" || status === "maturing-soon" || status === "unknown";
    }
    if (filter === "expired") return status === "expired";
    if (filter === "upcoming") return status === "upcoming";
    return true;
  });
}

export function partitionByLifecycle(products: ProductRecord[], asOf = new Date()) {
  const buckets: Record<LifecycleStatus, ProductRecord[]> = {
    ongoing: [],
    expired: [],
    perpetual: [],
    "maturing-soon": [],
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
