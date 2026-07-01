import type { ProductRecord } from "@/lib/types";
import { getIndexEntryLevelRaw, getProductTradeDate, rawField } from "@/lib/product-utils";
import { formatCrores } from "@/lib/utils";
import { parseExcelishDate } from "@/lib/workbook/dates";

export type ProductDataAssessment = {
  canValue: boolean;
  canPayoff: boolean;
  blockers: string[];
  warnings: string[];
  missingFormula: boolean;
  missingDescription: boolean;
  missingEntryLevel: boolean;
  missingObsSchedule: boolean;
};

function hasObservationSchedule(product: ProductRecord) {
  const months = rawField(product, "Observation Months");
  if (months?.trim()) return true;
  for (const key of ["Avg. 2", "Avg. 3", "Avg. 4", "Avg. 5", "Avg. 6", "Avg. 7"]) {
    if (rawField(product, key)) return true;
  }
  if (product.lastObservationDateRaw?.trim()) return true;
  if (rawField(product, "Last Observation Date", "Final Observation Date")) return true;
  return false;
}

export function assessProductData(product: ProductRecord | undefined): ProductDataAssessment {
  const empty: ProductDataAssessment = {
    canValue: false,
    canPayoff: false,
    blockers: ["No product selected."],
    warnings: [],
    missingFormula: true,
    missingDescription: true,
    missingEntryLevel: true,
    missingObsSchedule: true,
  };
  if (!product) return empty;

  const blockers: string[] = [];
  const warnings: string[] = [];

  const formula = product.formulaText?.trim();
  const missingFormula = !formula;
  if (missingFormula) {
    blockers.push("Payoff formula is missing in the master file — valuation and payoff cannot be computed.");
  }

  const description = product.productExplanation?.trim() || rawField(product, "Product Explanation", "Product explanation");
  const missingDescription = !description;
  if (missingDescription) {
    warnings.push("Product description is missing in the master file.");
  }

  const entry = getIndexEntryLevelRaw(product);
  const missingEntryLevel = entry == null || entry <= 0;
  if (missingEntryLevel) {
    blockers.push("Entry / initial fixing level is missing — cannot compute underlying performance.");
  }

  const tradeDate = getProductTradeDate(product);
  if (!tradeDate) {
    warnings.push("Trade / allotment date is missing — IRR and observation logic may be approximate.");
  }

  const missingObsSchedule = !hasObservationSchedule(product);
  if (missingObsSchedule) {
    warnings.push(
      "Observation dates are not in the master file — historical N lookup may be incomplete. Index levels for Nifty/Sensex are still fetched from market data where available.",
    );
  }

  if (!product.underlying?.trim()) {
    warnings.push("Underlying is blank — defaulting index selection may be wrong.");
  }

  const canPayoff = !missingFormula && !missingEntryLevel;
  const canValue = canPayoff;

  return {
    canValue,
    canPayoff,
    blockers,
    warnings,
    missingFormula,
    missingDescription,
    missingEntryLevel,
    missingObsSchedule,
  };
}

/** Run when user opens an output panel — one alert for blockers or missing description. */
export function handleOutputReveal(product: ProductRecord | undefined) {
  const assessment = assessProductData(product);
  if (assessment.blockers.length > 0) {
    window.alert(assessment.blockers.join("\n\n"));
    return;
  }
  if (assessment.missingDescription) {
    window.alert(
      "Product description is missing in the master file for this product. Valuation and payoff still use the payoff formula and market index levels.",
    );
  }
}

export function formatOptionalNumber(value: number | undefined | null, formatter: (n: number) => string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatter(value);
}

export function formatOptionalCrores(value: number | undefined | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return formatCrores(value);
}

export function deskDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDeskDateInput(value: string): Date | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseExcelishDate(value);
  if (parsed) return parsed;
  const native = new Date(value);
  return Number.isNaN(native.getTime()) ? undefined : native;
}
