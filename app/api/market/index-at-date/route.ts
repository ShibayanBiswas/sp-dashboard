import { NextResponse } from "next/server";

import { getIndexPriceOnOrBefore } from "@/lib/db/index-prices";
import { formatDeskDate } from "@/lib/market-data";
import { parseExcelishDate, toLocalDateKey } from "@/lib/workbook/dates";

export const dynamic = "force-dynamic";

/** Index closes for a desk date (MongoDB history). Optional minDate = trade date floor. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("date");
  const minRaw = searchParams.get("minDate");
  if (!raw) {
    return NextResponse.json({ error: "date query param required (desk or ISO format)." }, { status: 400 });
  }

  const parsed = parseExcelishDate(raw);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const iso = toLocalDateKey(parsed);
  const minParsed = minRaw ? parseExcelishDate(minRaw) : undefined;
  const minIso = minParsed ? toLocalDateKey(minParsed) : undefined;

  if (minIso && iso < minIso) {
    return NextResponse.json({
      error: "Valuation date cannot be before product trade date.",
      valuationDate: formatDeskDate(parsed),
      isoDate: iso,
      minDate: minIso,
    }, { status: 400 });
  }

  const stored = await getIndexPriceOnOrBefore(iso, minIso);

  if (!stored) {
    return NextResponse.json({
      valuationDate: formatDeskDate(parsed),
      isoDate: iso,
      minDate: minIso ?? null,
      niftyLevel: null,
      sensexLevel: null,
      source: "missing" as const,
    });
  }

  return NextResponse.json({
    valuationDate: formatDeskDate(parsed),
    isoDate: stored.date,
    minDate: minIso ?? null,
    niftyLevel: stored.nifty,
    sensexLevel: stored.sensex,
    source: "mongodb" as const,
  });
}
