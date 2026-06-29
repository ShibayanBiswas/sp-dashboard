import * as XLSX from "xlsx";

import {
  filterProductsByLifecycle,
  getDaysToMaturity,
  getProductLifecycleStatus,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { getCouponLabel, getDebenturePrice, getIndexEntryLevel, rawField } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { formatCrores } from "@/lib/utils";

const CORE_COLUMNS = [
  "Lifecycle",
  "Days to Maturity",
  "Product Name",
  "ISIN",
  "Series",
  "Issuer",
  "Underlying",
  "Category",
  "Notional (₹ Cr)",
  "Coupon",
  "Entry Level",
  "Maturity",
  "Last Observation",
  "Tenor (Days)",
  "Principal Protection",
  "Listing",
  "Product Type",
  "Debenture Price",
  "Payoff Formula",
] as const;

function productToExportRow(product: ProductRecord, asOf = new Date()) {
  const status = getProductLifecycleStatus(product, asOf);
  const days = getDaysToMaturity(product, asOf);
  const row: Record<string, string | number | boolean | null> = {
    Lifecycle: LIFECYCLE_STATUS_LABELS[status],
    "Days to Maturity": days ?? "",
    "Product Name": product.name,
    ISIN: product.isin ?? "",
    Series: product.series ?? "",
    Issuer: product.issuer ?? "",
    Underlying: product.underlying ?? "",
    Category: product.category,
    "Notional (₹ Cr)": product.tradeAmount != null ? Number((product.tradeAmount / 1e7).toFixed(4)) : "",
    Coupon: getCouponLabel(product) ?? "",
    "Entry Level": getIndexEntryLevel(product),
    Maturity: product.maturityRaw ?? "",
    "Last Observation": product.lastObservationDateRaw ?? "",
    "Tenor (Days)": product.tenorDays ?? "",
    "Principal Protection": product.principalProtection ?? "",
    Listing: product.listing ?? "",
    "Product Type": product.productType ?? "",
    "Debenture Price": getDebenturePrice(product),
    "Payoff Formula": product.formulaText ?? "",
  };

  for (const [key, value] of Object.entries(product.raw)) {
    if (key in row) continue;
    row[key] = value;
  }

  return row;
}

function autoColumnWidths(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0] ?? {});
  return keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.slice(0, 200).map((row) => String(row[key] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 48) };
  });
}

function buildSheet(rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoColumnWidths(rows);
  if (rows.length > 0) {
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: Object.keys(rows[0]).length - 1 } }) };
  }
  return ws;
}

export function downloadProductsExcel(
  products: ProductRecord[],
  filename: string,
  options?: { asOf?: Date; sheetName?: string },
) {
  const asOf = options?.asOf ?? new Date();
  const rows = products.map((p) => productToExportRow(p, asOf));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), options?.sheetName ?? "Products");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function downloadLifecycleWorkbook(
  products: ProductRecord[],
  filename = "SP-Portfolio-Lifecycle.xlsx",
  asOf = new Date(),
) {
  const wb = XLSX.utils.book_new();
  const buckets: Array<{ name: string; filter: LifecycleFilter | "summary" }> = [
    { name: "Summary", filter: "summary" },
    { name: "Ongoing", filter: "ongoing" },
    { name: "Expiring in 3M", filter: "expiring-3m" },
    { name: "Expiring in 1M", filter: "expiring-1m" },
    { name: "Expired", filter: "expired" },
  ];

  const summaryRows = buckets
    .filter((b): b is { name: string; filter: LifecycleFilter } => b.filter !== "summary")
    .map((bucket) => {
      const pool = filterProductsByLifecycle(products, bucket.filter, asOf);

      const notional = pool.reduce((sum, p) => sum + (p.tradeAmount ?? 0), 0);
      return {
        Category: bucket.name,
        Products: pool.length,
        "Notional (₹ Cr)": Number((notional / 1e7).toFixed(4)),
        "Notional (formatted)": formatCrores(notional),
      };
    });

  XLSX.utils.book_append_sheet(wb, buildSheet(summaryRows), "Summary");

  for (const bucket of buckets) {
    if (bucket.filter === "summary") continue;
    const pool = filterProductsByLifecycle(products, bucket.filter, asOf);
    if (pool.length === 0) continue;
    const rows = pool.map((p) => productToExportRow(p, asOf));
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), bucket.name.slice(0, 31));
  }

  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export { CORE_COLUMNS };
