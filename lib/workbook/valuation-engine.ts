import { getFaceValue, getIndexEntryLevel, rawField } from "@/lib/product-utils";
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

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function resolveAllotmentDate(product: ProductRecord, valuationDate: Date) {  const tradeDateRaw = rawField(
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

/**
 * Primary Valuation Working sheet parity:
 * K = index entry · M = val-date index · O = M/K − 1 · S = formula(O)
 * Per-debenture value = price × (1 + S) · IRR = (value / price)^(365 / elapsed days) − 1
 */
export function computeValuation(product: ProductRecord, inputs: ValuationInputs): ValuationResult {
  const indexEntryLevel = getIndexEntryLevel(product);
  const pricePerDebenture =
    inputs.purchasePrice ?? product.pricePerDebenture ?? getFaceValue(product);
  const debentures = inputs.debentures ?? 100;
  const currentLevel = inputs.currentLevel ?? indexEntryLevel;

  const z = indexEntryLevel > 0 ? currentLevel / indexEntryLevel - 1 : 0;
  const formula = product.formulaText ?? "Z";
  const absReturn = evaluatePayoffFormula(formula, z);

  const productValue = pricePerDebenture * (1 + absReturn);
  const clientInvestment = pricePerDebenture;
  const totalAmount = productValue * debentures;

  const valuationDate =
    (typeof inputs.valuationDate === "string" ? parseExcelishDate(inputs.valuationDate) : undefined) ??
    new Date();

  const allotmentDate = resolveAllotmentDate(product, valuationDate);
  const maturityDate = parseExcelishDate(product.maturityRaw ?? product.lastObservationDateRaw);
  const remainingTenorDays = maturityDate
    ? Math.max(1, daysBetween(valuationDate, maturityDate))
    : product.tenorDays ?? 365;

  const rawElapsed = daysBetween(allotmentDate, valuationDate);
  const elapsedDays = Math.max(30, rawElapsed);

  const growth = clientInvestment > 0 ? productValue / clientInvestment : 1;
  const productIrr = annualizedIrr(growth, elapsedDays);

  return {
    productValue,
    absReturn,
    productIrr,
    z,
    indexEntryLevel,
    currentLevel,
    totalAmount,
    remainingTenorDays,
    elapsedDays,
    clientInvestment,
  };
}

/** Batch valuation for Working sub-page — all products in pool. */
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
