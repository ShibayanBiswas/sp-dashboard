import { NextResponse } from "next/server";

import { loadProductsFromMongo } from "@/lib/db/sync-master";
import { isMongoConfigured } from "@/lib/db/mongo";
import type { DashboardDataset } from "@/lib/types";

/** Load latest Primary book from MongoDB when configured. */
export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ ok: false, reason: "mongodb_not_configured" }, { status: 503 });
  }

  const products = await loadProductsFromMongo();
  if (!products?.length) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 404 });
  }

  const dataset: DashboardDataset = {
    workbookName: "MongoDB master",
    loadedAt: new Date().toISOString(),
    products,
    sheets: [],
    hiddenDependencySheets: [],
    categorySummaries: [],
    formulaCatalog: [],
    validationIssues: [],
  };

  return NextResponse.json({ ok: true, dataset });
}
