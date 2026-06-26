import { getClientInvestment, getIndexEntryLevel, rawField } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { parseExcelishDate } from "@/lib/workbook/dates";
import { annualizedIrr } from "@/lib/workbook/irr";

export interface ValuationInputs {
  valuationDate?: string;
  currentLevel?: number;
  debentures?: number;
  purchasePrice?: number;
}

export interface ValuationResult {
  productValue: number;
  absReturn: number;
  productIrr: number;
  z: number;
  indexEntryLevel: number;
  currentLevel: number;
  totalAmount: number;
  remainingTenorDays: number;
  elapsedDays: number;
  clientInvestment: number;
}

const DESK_DISCOUNT_RATE = 0.11;

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function resolveAllotmentDate(product: ProductRecord, valuationDate: Date) {
  const tradeDateRaw = rawField(
    product,
    "Trade Date/Opening date",
    "Allotment Date",
    "Trade Date",
    "Month",
  );
  const parsed = tradeDateRaw ? parseExcelishDate(tradeDateRaw) : undefined;
  if (parsed && parsed.getTime() <= valuationDate.getTime()) {
    return parsed;
  }

  const maturity = parseExcelishDate(product.maturityRaw ?? product.lastObservationDateRaw);
  if (maturity && product.tenorDays && product.tenorDays > 0) {
    const estimated = new Date(maturity.getTime() - product.tenorDays * 86400000);
    if (estimated.getTime() <= valuationDate.getTime()) {
      return estimated;
    }
  }

  return parsed ?? valuationDate;
}

/** Last observation date — uses the latest parsed date when the master lists several. */
function resolveObservationDate(product: ProductRecord) {
  const raw = product.lastObservationDateRaw ?? rawField(product, "Last Observation Date", "Final Observation Date");
  if (!raw) return undefined;

  const parts = String(raw)
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const parsed = parts.map((p) => parseExcelishDate(p)).filter((d): d is Date => d !== undefined);
  if (parsed.length === 0) return parseExcelishDate(raw);
  return parsed.reduce((latest, d) => (d.getTime() > latest.getTime() ? d : latest));
}

/**
 * Working!U — re-exported from product-utils for valuation batch callers.
 */
export { getClientInvestment } from "@/lib/product-utils";

/**
 * Working!V — final valuation before the IF(V>U,U) cap.
 * Branch follows obs date vs valuation date, matching the May-26 workbook.
 */
function computeFinalValuation(
  clientInvestment: number,
  formulaReturn: number,
  allotmentDate: Date,
  valuationDate: Date,
  maturityDate: Date,
  observationDate: Date | undefined,
) {
  const U = clientInvestment;
  const S = formulaReturn;
  const F = allotmentDate;
  const G = valuationDate;
  const H = maturityDate;

  const obsOnOrAfterVal =
    observationDate !== undefined && observationDate.getTime() >= valuationDate.getTime();

  if (obsOnOrAfterVal) {
    const tenorAllotToMaturity = Math.max(1, daysBetween(F, H));
    const rowIrr = Math.pow(1 + S, 365 / tenorAllotToMaturity) - 1;
    const daysAllotToVal = Math.max(1, daysBetween(F, G));
    return U * Math.pow(1 + rowIrr, daysAllotToVal / 365);
  }

  const daysValToMaturity = Math.max(1, daysBetween(G, H));
  const discountFactor = Math.pow(1 + DESK_DISCOUNT_RATE, daysValToMaturity / 365);
  const adjusted = (1 + S) / discountFactor - 1;
  return U * (1 + adjusted);
}

/**
 * Primary Valuation Working sheet parity:
 * O = M/K − 1 · S = formula(O) · V = desk final val · X = max(V,U)
 * Product Value = X · Abs. Ret = X/U − 1 · IRR = (X/U)^(365/(G−F)) − 1
 */
export function computeValuation(product: ProductRecord, inputs: ValuationInputs): ValuationResult {
  const indexEntryLevel = getIndexEntryLevel(product);
  const clientInvestment = getClientInvestment(product);
  const debentures = inputs.debentures ?? 100;
  const currentLevel = inputs.currentLevel ?? indexEntryLevel;

  const performance = indexEntryLevel > 0 ? currentLevel / indexEntryLevel - 1 : 0;
  const formula = product.formulaText ?? "Z";
  const formulaReturn = evaluatePayoffFormula(formula, performance);

  const valuationDate =
    (typeof inputs.valuationDate === "string" ? parseExcelishDate(inputs.valuationDate) : undefined) ??
    new Date();
  const allotmentDate = resolveAllotmentDate(product, valuationDate);
  const maturityDate =
    parseExcelishDate(product.maturityRaw ?? product.lastObservationDateRaw) ??
    new Date(valuationDate.getTime() + (product.tenorDays ?? 365) * 86400000);
  const observationDate = resolveObservationDate(product);

  const finalValuation = computeFinalValuation(
    clientInvestment,
    formulaReturn,
    allotmentDate,
    valuationDate,
    maturityDate,
    observationDate,
  );

  const productValue = Math.max(finalValuation, clientInvestment);
  const absReturn = clientInvestment > 0 ? productValue / clientInvestment - 1 : formulaReturn;
  const totalAmount = productValue * debentures;

  const rawElapsed = daysBetween(allotmentDate, valuationDate);
  const elapsedDays = Math.max(30, rawElapsed);
  const remainingTenorDays = Math.max(1, daysBetween(valuationDate, maturityDate));

  const growth = clientInvestment > 0 ? productValue / clientInvestment : 1;
  const productIrr = annualizedIrr(growth, elapsedDays);

  return {
    productValue,
    absReturn,
    productIrr,
    z: performance,
    indexEntryLevel,
    currentLevel,
    totalAmount,
    remainingTenorDays,
    elapsedDays,
    clientInvestment,
  };
}

export function computeValuationBatch(
  products: ProductRecord[],
  shared: Omit<ValuationInputs, "debentures"> & { debentures?: number },
) {
  return products.map((product) => ({
    product,
    result: computeValuation(product, {
      ...shared,
      debentures: shared.debentures ?? 100,
    }),
  }));
}
