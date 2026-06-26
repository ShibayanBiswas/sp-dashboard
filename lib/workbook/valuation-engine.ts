import { getEntryLevel, getFaceValue } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { parseExcelishDate } from "@/lib/workbook/dates";

export interface ValuationInputs {
  valuationDate?: string;
  currentLevel?: number;
  debentures?: number;
  purchasePrice?: number;
  purchaseDate?: string;
}

export interface ValuationResult {
  productValue: number;
  absReturn: number;
  productIrr: number;
  z: number;
  entryLevel: number;
  currentLevel: number;
  totalAmount: number;
  remainingTenorDays: number;
}

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export function computeValuation(product: ProductRecord, inputs: ValuationInputs): ValuationResult {
  const entryLevel = getEntryLevel(product);
  const faceValue = getFaceValue(product);
  const debentures = inputs.debentures ?? 100;
  const currentLevel = inputs.currentLevel ?? entryLevel;
  const z = entryLevel > 0 ? currentLevel / entryLevel - 1 : 0;
  const formula = product.formulaText ?? "Z";

  const absReturn = evaluatePayoffFormula(formula, z);
  const unitValue = faceValue * (1 + absReturn);
  const productValue = unitValue / debentures > 0 ? unitValue : faceValue * (1 + absReturn);
  const totalAmount = productValue * debentures;

  const valuationDate =
    (typeof inputs.valuationDate === "string" ? parseExcelishDate(inputs.valuationDate) : undefined) ??
    new Date();
  const maturityDate = parseExcelishDate(product.maturityRaw ?? product.lastObservationDateRaw);
  const purchaseDate =
    (typeof inputs.purchaseDate === "string" ? parseExcelishDate(inputs.purchaseDate) : undefined) ??
    valuationDate;

  const remainingTenorDays = maturityDate
    ? daysBetween(valuationDate, maturityDate)
    : product.tenorDays ?? 365;

  const elapsedDays = product.tenorDays
    ? Math.max(1, product.tenorDays - remainingTenorDays)
    : daysBetween(purchaseDate, valuationDate);

  const productIrr =
    elapsedDays > 0 && absReturn > -1
      ? Math.pow(1 + absReturn, 365 / Math.max(elapsedDays, remainingTenorDays)) - 1
      : 0;

  return {
    productValue,
    absReturn,
    productIrr,
    z,
    entryLevel,
    currentLevel,
    totalAmount,
    remainingTenorDays,
  };
}
