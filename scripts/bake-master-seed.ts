import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DashboardDataset } from "../lib/types";
import { parseWorkbookBuffer } from "../lib/workbook/parser";

const ROOT = process.cwd();
const WORKBOOK = join(ROOT, "New Product Master_.xlsx");
const OUT = join(ROOT, "lib", "data", "master-seed.json");

const file = readFileSync(WORKBOOK);
const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
const full = parseWorkbookBuffer(arrayBuffer, "New Product Master_.xlsx");

const dataset: DashboardDataset = {
  workbookName: full.workbookName,
  loadedAt: full.loadedAt,
  products: full.products,
  categorySummaries: full.categorySummaries,
  validationIssues: full.validationIssues,
  formulaCatalog: [],
  sheets: [],
  hiddenDependencySheets: [],
};

writeFileSync(OUT, JSON.stringify(dataset));
console.log(`Baked ${dataset.products.length} products to master-seed.json`);
console.log(
  `Primary: ${dataset.categorySummaries.find((s) => s.category === "Primary")?.productCount} products`,
);
