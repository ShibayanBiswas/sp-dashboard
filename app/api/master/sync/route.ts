import { NextResponse } from "next/server";

import { syncMasterDatasetToMongo } from "@/lib/db/sync-master";
import type { DashboardDataset } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const dataset = (await request.json()) as DashboardDataset;
    if (!dataset?.products?.length) {
      return NextResponse.json({ error: "Empty dataset." }, { status: 400 });
    }
    const result = await syncMasterDatasetToMongo(dataset);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mongo sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
