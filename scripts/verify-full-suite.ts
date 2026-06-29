/**
 * Full desk QA — parses latest master Excel (or seed fallback), validates every product
 * across lifecycle buckets: formulas, narrative formatting, payoff tables, valuation.
 *
 * Usage:
 *   npm run verify:full          # uses New Product Master_.xlsx if present
 *   npm run verify               # bake + counts + full suite
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateProductCatalog } from "../lib/workbook/product-validator";
import { parseWorkbookBuffer } from "../lib/workbook/parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKBOOK = join(ROOT, "New Product Master_.xlsx");
const SEED = join(ROOT, "lib", "data", "master-seed.json");

function loadProducts() {
  if (existsSync(WORKBOOK)) {
    console.log(`Loading ${WORKBOOK}…`);
    const file = readFileSync(WORKBOOK);
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    const dataset = parseWorkbookBuffer(arrayBuffer, "New Product Master_.xlsx");
    return { source: "xlsx", products: dataset.products, validationIssues: dataset.validationIssues.length };
  }

  console.log(`Workbook not found — using ${SEED}`);
  const seed = JSON.parse(readFileSync(SEED, "utf8")) as { products: import("../lib/types").ProductRecord[] };
  return { source: "seed", products: seed.products, validationIssues: 0 };
}

const { source, products, validationIssues } = loadProducts();
const asOf = new Date();
const report = validateProductCatalog(products, asOf);

console.log("\n=== SP Dashboard Full Validation ===");
console.log(`Source: ${source}`);
console.log(`As of: ${asOf.toLocaleString("en-IN")}`);
console.log(`Products: ${report.totalProducts} · With formula: ${report.withFormula}`);
console.log(`Parser warnings from ingest: ${validationIssues}`);

console.log("\n--- Lifecycle buckets ---");
for (const [key, bucket] of Object.entries(report.byLifecycle)) {
  console.log(`  ${key}: ${bucket.count} products · ${bucket.issues} issue(s)`);
}

console.log("\n--- Spot checks ---");
for (const check of report.spotChecks) {
  console.log(`  ${check.passed ? "✓" : "✗"} ${check.label}`);
  console.log(`      ${check.detail}`);
}

if (report.issues.length) {
  console.log(`\n--- All issues (${report.issues.length}) — first 30 ---`);
  const grouped = new Map<string, number>();
  for (const issue of report.issues) {
    grouped.set(issue.code, (grouped.get(issue.code) ?? 0) + 1);
  }
  console.log("By code:", Object.fromEntries(grouped));

  for (const issue of report.issues.slice(0, 30)) {
    console.log(`  [${issue.code}] ${issue.isin ?? issue.productId} · ${issue.name}`);
    console.log(`      ${issue.message}`);
  }
  if (report.issues.length > 30) {
    console.log(`  … and ${report.issues.length - 30} more`);
  }
}

if (report.ongoingCritical.length) {
  console.log(`\n--- Ongoing critical (${report.ongoingCritical.length}) — first 20 ---`);
  for (const issue of report.ongoingCritical.slice(0, 20)) {
    console.log(`  [${issue.code}] ${issue.isin ?? issue.productId} · ${issue.message}`);
  }
}

console.log(`\n=== ${report.passed ? "PASSED" : "FAILED"} (ongoing critical: ${report.ongoingCritical.length}) ===\n`);

if (!report.passed) {
  process.exit(1);
}
