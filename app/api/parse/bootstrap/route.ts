import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import type { DashboardDataset } from "@/lib/types";

export async function GET() {
  try {
    const seedPath = join(/* turbopackIgnore: true */ process.cwd(), "lib", "data", "master-seed.json");
    const dataset = JSON.parse(readFileSync(seedPath, "utf-8")) as DashboardDataset;
    if (!dataset.products?.length) {
      return NextResponse.json({ error: "Master seed is empty. Run npm run bake." }, { status: 503 });
    }
    return NextResponse.json(dataset);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bootstrap parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
