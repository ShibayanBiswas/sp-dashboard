/**
 * Sync `New Product Master_.xlsx` (Primary sheet) → MongoDB.
 * Preserves empty/NaN cells as null — no default fill-ins.
 *
 * Usage: npm run sync:master
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { pingMongo } from "../lib/db/mongo";
import { syncMasterDatasetToMongo } from "../lib/db/sync-master";
import { loadMasterDatasetFromDisk, MASTER_FILE_NAME } from "../lib/server/master-file";

function loadDotEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadDotEnvLocal();

  const ping = await pingMongo();
  if (!ping.ok) {
    console.error(`MongoDB unavailable: ${ping.reason}`);
    process.exit(1);
  }

  const dataset = loadMasterDatasetFromDisk();
  if (!dataset?.products.length) {
    console.error(`Master file not found or empty: ${MASTER_FILE_NAME}`);
    process.exit(1);
  }

  const primaryCount = dataset.products.filter((p) => p.category === "Primary").length;
  console.log(`Parsing ${MASTER_FILE_NAME}: ${dataset.products.length} products (${primaryCount} Primary)`);

  const result = await syncMasterDatasetToMongo(dataset);
  if (!result.ok) {
    console.error(`Sync failed: ${result.reason}`);
    process.exit(1);
  }

  console.log(`OK: synced ${result.productCount} products to MongoDB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
