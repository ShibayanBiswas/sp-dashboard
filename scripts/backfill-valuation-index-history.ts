/**
 * Expand valuation-index-history.json from Working!AJ:AK and Yahoo Nifty closes
 * for observation dates missing from the desk table.
 *
 * Usage: npm run backfill:index-history
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import { mergeIndexHistoryEntries, type IndexHistoryEntry } from "../lib/workbook/index-history";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VALUATION_XLSM = join(
  ROOT,
  "Dashboards - 31st May 26",
  "Primary Structured Products Valuation - 31st May 26.xlsm",
);
const HISTORY_PATH = join(ROOT, "lib", "data", "valuation-index-history.json");

async function fetchYahooDaily(symbol: string, period1: number, period2: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SP-Dashboard/1.0" },
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
  const bySerial = new Map<number, number>();
  const base = Date.UTC(1899, 11, 30);
  for (let i = 0; i < stamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    const d = new Date(stamps[i]! * 1000);
    const serial = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - base) / 86400000);
    bySerial.set(serial, Math.round(close * 100) / 100);
  }
  return bySerial;
}

function readAjAk(ws: XLSX.WorkSheet) {
  const entries: IndexHistoryEntry[] = [];
  for (let r = 0; r < 600; r++) {
    const dateSerial = ws[XLSX.utils.encode_cell({ r, c: 35 })]?.v;
    const level = ws[XLSX.utils.encode_cell({ r, c: 36 })]?.v;
    if (typeof dateSerial === "number" && typeof level === "number" && Number.isFinite(dateSerial) && Number.isFinite(level)) {
      entries.push({ dateSerial, level });
    }
  }
  return entries;
}

function readObservationSerials(ws: XLSX.WorkSheet, valDateSerial: number) {
  const serials = new Set<number>();
  const ref = ws["!ref"];
  if (!ref) return serials;
  const range = XLSX.utils.decode_range(ref);
  for (let r = 2; r <= range.e.r; r++) {
    const v = ws[XLSX.utils.encode_cell({ r, c: 8 })]?.v;
    if (typeof v === "number" && Number.isFinite(v) && v <= valDateSerial) serials.add(v);
  }
  return serials;
}

async function main() {
  const existing = JSON.parse(readFileSync(HISTORY_PATH, "utf8")) as {
    source: string;
    entries: IndexHistoryEntry[];
  };

  let fromWorkbook: IndexHistoryEntry[] = [];
  let missingSerials: number[] = [];

  if (existsSync(VALUATION_XLSM)) {
    const wb = XLSX.readFile(VALUATION_XLSM, { cellDates: false });
    const ws = wb.Sheets.Working;
    if (ws) {
      fromWorkbook = readAjAk(ws);
      const valDateSerial = typeof ws.B1?.v === "number" ? ws.B1.v : 46173;
      const obsSerials = readObservationSerials(ws, valDateSerial);
      const known = new Set(fromWorkbook.map((e) => e.dateSerial));
      missingSerials = [...obsSerials].filter((s) => !known.has(s)).sort((a, b) => a - b);
    }
  }

  let yahooAdds: IndexHistoryEntry[] = [];
  if (missingSerials.length > 0) {
    const min = missingSerials[0]!;
    const max = missingSerials[missingSerials.length - 1]!;
    const base = Date.UTC(1899, 11, 30);
    const period1 = Math.floor((base + min * 86400000) / 1000) - 86400 * 7;
    const period2 = Math.floor((base + max * 86400000) / 1000) + 86400 * 7;
    const niftyBySerial = await fetchYahooDaily("^NSEI", period1, period2);

    if (niftyBySerial) {
      for (const serial of missingSerials) {
        const exact = niftyBySerial.get(serial);
        if (exact != null) {
          yahooAdds.push({ dateSerial: serial, level: exact });
          continue;
        }
        let bestSerial: number | undefined;
        let bestLevel: number | undefined;
        for (const [s, level] of niftyBySerial) {
          if (s <= serial && (bestSerial === undefined || s > bestSerial)) {
            bestSerial = s;
            bestLevel = level;
          }
        }
        if (bestSerial != null && bestLevel != null) {
          yahooAdds.push({ dateSerial: serial, level: bestLevel });
        }
      }
    }
  }

  const merged = mergeIndexHistoryEntries(existing.entries, [...fromWorkbook, ...yahooAdds]);
  const payload = {
    source: "Working!AJ:AK + Yahoo ^NSEI backfill",
    entries: merged,
  };

  writeFileSync(HISTORY_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Index history: ${existing.entries.length} → ${merged.length} rows`);
  console.log(`  Workbook AJ:AK: ${fromWorkbook.length}`);
  console.log(`  Yahoo backfill: ${yahooAdds.length} (from ${missingSerials.length} missing obs serials)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
