import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { ensureMongoIndexes, isMongoConfigured } from "@/lib/db/mongo";
import { loadProductsFromMongo, syncMasterDatasetToMongo } from "@/lib/db/sync-master";
import { loadMasterDatasetFromDisk } from "@/lib/server/master-file";
import type { DashboardDataset } from "@/lib/types";

export async function GET() {
  try {
    if (isMongoConfigured()) {
      await ensureMongoIndexes();
      let products = await loadProductsFromMongo();

      if (!products?.length) {
        const dataset = loadMasterDatasetFromDisk();
        if (dataset?.products.length) {
          await syncMasterDatasetToMongo(dataset);
          products = await loadProductsFromMongo();
        }
      }

      if (products?.length) {
        const dataset: DashboardDataset = {
          workbookName: "MongoDB · New Product Master",
          loadedAt: new Date().toISOString(),
          products,
          sheets: [],
          hiddenDependencySheets: [],
          categorySummaries: [],
          formulaCatalog: [],
          validationIssues: [],
        };
        return NextResponse.json(dataset);
      }
    }

    const diskDataset = loadMasterDatasetFromDisk();
    if (diskDataset?.products.length) {
      return NextResponse.json(diskDataset);
    }

    const seedPath = join(process.cwd(), "lib", "data", "master-seed.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as DashboardDataset;
    if (!seed.products?.length) {
      return NextResponse.json({ error: "Master seed is empty. Upload New Product Master_.xlsx" }, { status: 503 });
    }
    return NextResponse.json(seed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bootstrap parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
