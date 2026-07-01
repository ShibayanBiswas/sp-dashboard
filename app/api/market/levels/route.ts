import { NextResponse } from "next/server";

import { syncIndexPricesFromYahoo } from "@/lib/db/index-prices";
import { fetchLiveMarketLevels } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const levels = await fetchLiveMarketLevels();
  void syncIndexPricesFromYahoo();
  return NextResponse.json(levels, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
