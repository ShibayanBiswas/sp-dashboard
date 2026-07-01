import type { ProductRecord } from "@/lib/types";
import { rawField } from "@/lib/product-utils";
import { parseExcelishDate, toExcelSerial } from "@/lib/workbook/dates";
import indexHistory from "@/lib/data/valuation-index-history.json";
import { lookupIndexLevelOnOrBefore, type IndexHistoryEntry } from "@/lib/workbook/index-history";
import { xirrEntryToCurrent } from "@/lib/workbook/valuation-serial";

const HISTORY = new Map<number, number>(
  indexHistory.entries.map((row) => [row.dateSerial, row.level]),
);

// Pre-sorted for on-or-before lookup (Working!N VLOOKUP semantics).
const SORTED_HISTORY: IndexHistoryEntry[] = [...indexHistory.entries].sort(
  (a, b) => a.dateSerial - b.dateSerial,
);

function parseObservationDates(product: ProductRecord): Date[] {
  const fromMonths = String(rawField(product, "Observation Months") ?? "")
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const fromAvgs = ["Avg. 2", "Avg. 3", "Avg. 4", "Avg. 5", "Avg. 6", "Avg. 7"].flatMap((key) => {
    const value = rawField(product, key);
    return value != null && String(value).trim() ? [String(value).trim()] : [];
  });

  const parsed = [...fromMonths, ...fromAvgs]
    .map((value) => parseExcelishDate(value))
    .filter((date): date is Date => date !== undefined);

  const unique = new Map<number, Date>();
  for (const date of parsed) {
    unique.set(date.getTime(), date);
  }
  return [...unique.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** Working!I — 2nd-last observation on/before valuation date (or sole obs if only one). */
export function resolveWorkingObservationDate(product: ProductRecord, valuationDate: Date): Date | undefined {
  const onOrBefore = parseObservationDates(product)
    .filter((date) => date.getTime() <= valuationDate.getTime())
    .sort((a, b) => b.getTime() - a.getTime());

  if (onOrBefore.length >= 2) return onOrBefore[1];
  if (onOrBefore.length === 1) return onOrBefore[0];

  return parseExcelishDate(product.lastObservationDateRaw ?? rawField(product, "Last Observation Date"));
}

function lookupHistoricalIndexLevel(observationDate: Date): number | undefined {
  const serial = toExcelSerial(observationDate);
  return HISTORY.get(serial) ?? lookupIndexLevelOnOrBefore(SORTED_HISTORY, serial);
}

/** Working!N — expected underlying at 2nd-last obs date. */
export function computeExpectedUnderlyingLevel(
  entryLevel: number,
  currentLevel: number,
  allotmentDate: Date,
  valuationDate: Date,
  observationDate: Date | undefined,
  serialDesk?: { allotment?: number; valuation?: number; observation?: number },
): number | "NA" | undefined {
  if (!observationDate || entryLevel <= 0 || currentLevel <= 0) return undefined;

  const F = serialDesk?.allotment ?? toExcelSerial(allotmentDate);
  const B1 = serialDesk?.valuation ?? toExcelSerial(valuationDate);
  const I = serialDesk?.observation ?? toExcelSerial(observationDate);

  if (I - B1 >= 0) {
    if (currentLevel < entryLevel) return "NA";
    const xirr = xirrEntryToCurrent(entryLevel, currentLevel, B1 - F);
    return entryLevel * Math.pow(1 + xirr, (I - F) / 365);
  }

  return lookupHistoricalIndexLevel(observationDate);
}

/** Working!O — underlying performance fed into the payoff formula. */
export function computeUnderlyingPerformance(
  entryLevel: number,
  currentLevel: number,
  expectedLevel: number | "NA" | undefined,
): number {
  if (entryLevel <= 0) return 0;
  if (expectedLevel === "NA" || expectedLevel == null || !Number.isFinite(expectedLevel)) {
    return currentLevel / entryLevel - 1;
  }
  return expectedLevel / entryLevel - 1;
}
