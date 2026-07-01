/**
 * Scan master Primary products for missing fields / NaN — edge-case report.
 * Usage: npm run verify:edge-cases
 * Writes: docs/edge-case-audit.md
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { filterProductsByLifecycle, filterValidMasterProducts } from "../lib/product-lifecycle";
import { assessProductData } from "../lib/product-data-guards";
import { parseExcelishDate } from "../lib/workbook/dates";
import { parseWorkbookBuffer } from "../lib/workbook/parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MASTER = join(ROOT, "New Product Master_.xlsx");
const REPORT = join(ROOT, "docs", "edge-case-audit.md");
const AS_OF = parseExcelishDate("31-May-26") ?? new Date(2026, 4, 31);

function main() {
  if (!existsSync(MASTER)) {
    console.error("Master file missing");
    process.exit(1);
  }
  const file = readFileSync(MASTER);
  const buf = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const dataset = parseWorkbookBuffer(buf, "New Product Master_.xlsx");
  const valid = filterValidMasterProducts(dataset.products, AS_OF);
  const ongoing = filterProductsByLifecycle(valid, "ongoing", AS_OF);
  const expired = filterProductsByLifecycle(valid, "expired", AS_OF);

  let noFormula = 0;
  let noEntry = 0;
  let noObs = 0;
  let noDesc = 0;
  let canValue = 0;

  const samples: string[] = [];

  for (const product of valid) {
    const a = assessProductData(product);
    if (a.missingFormula) noFormula += 1;
    if (a.missingEntryLevel) noEntry += 1;
    if (a.missingObsSchedule) noObs += 1;
    if (a.missingDescription) noDesc += 1;
    if (a.canValue) canValue += 1;
    if (a.blockers.length && samples.length < 15) {
      samples.push(`| ${product.isin ?? "—"} | ${product.name.replace(/\|/g, " ")} | ${a.blockers.join("; ")} |`);
    }
  }

  const lines = [
    "# Master edge-case audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Valid Primary products | ${valid.length} |`,
    `| Ongoing | ${ongoing.length} |`,
    `| Expired | ${expired.length} |`,
    `| Can value / payoff | ${canValue} |`,
    `| Missing formula | ${noFormula} |`,
    `| Missing entry level | ${noEntry} |`,
    `| Missing obs schedule | ${noObs} |`,
    `| Missing description | ${noDesc} |`,
    "",
    "## Sample blockers",
    "",
    "| ISIN | Product | Blocker |",
    "| --- | --- | --- |",
    ...samples,
    "",
    "## App handling",
    "",
    "- Missing formula or entry → output disclaimer + alert",
    "- Missing obs → warning only; index from Yahoo/Mongo",
    "- NaN cells → null in DB, **—** in UI",
    "",
  ];

  writeFileSync(REPORT, lines.join("\n"), "utf8");
  console.log(`Valid: ${valid.length} · Can value: ${canValue} · Missing formula: ${noFormula}`);
  console.log(`Report: ${REPORT}`);
}

main();
