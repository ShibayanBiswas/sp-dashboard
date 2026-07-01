import { COLLECTIONS, getMongoDb, isMongoConfigured } from "@/lib/db/mongo";
import { toLocalDateKey } from "@/lib/workbook/dates";

export interface IndexPriceRow {
  date: string;
  nifty: number;
  sensex: number;
  source: "yahoo" | "manual";
  updatedAt: Date;
}

async function fetchYahooDaily(symbol: string, period1: number, period2: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SP-Dashboard/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const rows: Array<{ date: string; close: number }> = [];
  for (let i = 0; i < stamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    rows.push({ date: toLocalDateKey(new Date(stamps[i]! * 1000)), close });
  }
  return rows;
}

/** Pull daily Nifty/Sensex closes from Yahoo and upsert into MongoDB. */
export async function syncIndexPricesFromYahoo(fromDate?: Date) {
  if (!isMongoConfigured()) return { ok: false, reason: "MONGODB_URI not set" as const };

  const db = await getMongoDb();
  if (!db) return { ok: false, reason: "db_unavailable" as const };

  const start = fromDate ?? new Date("2000-01-01");
  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  const [niftyRows, sensexRows] = await Promise.all([
    fetchYahooDaily("^NSEI", period1, period2),
    fetchYahooDaily("^BSESN", period1, period2),
  ]);

  if (!niftyRows?.length || !sensexRows?.length) {
    return { ok: false, reason: "yahoo_fetch_failed" as const };
  }

  const sensexByDate = new Map(sensexRows.map((r) => [r.date, r.close]));
  const col = db.collection<IndexPriceRow>(COLLECTIONS.indexPrices);
  const now = new Date();

  const ops = niftyRows
    .map((row) => {
      const sensex = sensexByDate.get(row.date);
      if (sensex == null) return null;
      return {
        updateOne: {
          filter: { date: row.date },
          update: {
            $set: {
              date: row.date,
              nifty: Math.round(row.close * 100) / 100,
              sensex: Math.round(sensex * 100) / 100,
              source: "yahoo" as const,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (ops.length > 0) {
    await col.bulkWrite(ops as Parameters<typeof col.bulkWrite>[0], { ordered: false });
  }

  return { ok: true as const, upserted: ops.length };
}

export async function getIndexPricesBetween(startDate: string, endDate: string) {
  if (!isMongoConfigured()) return [];
  const db = await getMongoDb();
  if (!db) return [];
  return db
    .collection<IndexPriceRow>(COLLECTIONS.indexPrices)
    .find({ date: { $gte: startDate, $lte: endDate } })
    .sort({ date: 1 })
    .toArray();
}

export async function getIndexPriceOn(date: string): Promise<IndexPriceRow | null> {
  if (!isMongoConfigured()) return null;
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<IndexPriceRow>(COLLECTIONS.indexPrices).findOne({ date });
}

/** Close on or before desk date — weekends/holidays; optional trade-date floor. */
export async function getIndexPriceOnOrBefore(date: string, minDate?: string): Promise<IndexPriceRow | null> {
  if (!isMongoConfigured()) return null;
  const db = await getMongoDb();
  if (!db) return null;

  const filter: { date: { $lte: string; $gte?: string } } = { date: { $lte: date } };
  if (minDate) filter.date.$gte = minDate;

  const rows = await db
    .collection<IndexPriceRow>(COLLECTIONS.indexPrices)
    .find(filter)
    .sort({ date: -1 })
    .limit(1)
    .toArray();

  return rows[0] ?? null;
}
