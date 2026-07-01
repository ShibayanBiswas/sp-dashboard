import { getDebenturePrice, getIndexEntryLevel, rawField } from "@/lib/product-utils";

import type { ProductRecord } from "@/lib/types";

import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";

import { parseExcelishDate, toExcelSerial } from "@/lib/workbook/dates";

import {

  computeExpectedUnderlyingLevel,

  computeUnderlyingPerformance,

  resolveWorkingObservationDate,

} from "@/lib/workbook/valuation-performance";

import {

  computeWorkingFinalValuation,

  workingColumnY,

  type WorkingSerialDates,

} from "@/lib/workbook/valuation-serial";



export interface ValuationInputs {

  valuationDate?: string;

  currentLevel?: number;

  debentures?: number;

  purchasePrice?: number;

  /** Optional Working-sheet row inputs for desk replay / parity tests. */

  deskRow?: {

    allotmentDate?: string | number;

    maturityDate?: string | number;

    observationDate?: string | number;

    entryLevel?: number;

    clientInvestment?: number;

    /** Working!P formula text — overrides master when replaying Excel rows. */

    formulaText?: string;

    /** Working!S (ProductReturns) — overrides formula evaluation when set. */

    formulaReturn?: number;

  };

}



export interface ValuationResult {

  productValue: number;

  absReturn: number;

  productIrr: number;

  formulaReturn: number;

  z: number;

  indexEntryLevel: number;

  currentLevel: number;

  totalAmount: number;

  remainingTenorDays: number;

  elapsedDays: number;

  clientInvestment: number;

}



function emptyValuationResult(): ValuationResult {

  return {

    productValue: 0,

    absReturn: 0,

    productIrr: 0,

    formulaReturn: 0,

    z: 0,

    indexEntryLevel: 0,

    currentLevel: 0,

    totalAmount: 0,

    remainingTenorDays: 0,

    elapsedDays: 0,

    clientInvestment: 0,

  };

}



function daysBetween(start: Date, end: Date) {

  return Math.round((end.getTime() - start.getTime()) / 86400000);

}



function resolveAllotmentDate(product: ProductRecord, valuationDate: Date) {

  const tradeDateRaw = rawField(

    product,

    "Allotment Date",

    "Trade Date/Opening date",

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



function asSerial(value: string | number | undefined, fallback: Date): number {

  if (typeof value === "number" && Number.isFinite(value) && value > 30_000) return value;

  if (value != null) {

    const parsed = parseExcelishDate(value);

    if (parsed) return toExcelSerial(parsed);

  }

  return toExcelSerial(fallback);

}



/**

 * Working!U — client investment per debenture (deal price), matching the Working sheet.

 */

export { getDebenturePrice as getWorkingClientInvestment } from "@/lib/product-utils";



/**

 * Primary Valuation Working sheet parity:

 * N/O = expected underlying performance · S = ProductReturns(P,O) · V = IF(I≥B1,…) · X = max(V,U)

 */

export function computeValuation(product: ProductRecord, inputs: ValuationInputs): ValuationResult {

  if (!product?.formulaText && !product?.name) {

    return emptyValuationResult();

  }



  const indexEntryLevel = inputs.deskRow?.entryLevel ?? getIndexEntryLevel(product);

  const clientInvestment = inputs.deskRow?.clientInvestment ?? getDebenturePrice(product);

  const debentures = Math.max(1, Math.round(inputs.debentures ?? 100));

  const rawLevel = inputs.currentLevel;

  const currentLevel =

    rawLevel != null && Number.isFinite(rawLevel) && rawLevel > 0 ? rawLevel : indexEntryLevel;



  const valuationDate =

    (typeof inputs.valuationDate === "string" ? parseExcelishDate(inputs.valuationDate) : undefined) ??

    new Date();

  const allotmentDate =

    (inputs.deskRow?.allotmentDate != null

      ? parseExcelishDate(inputs.deskRow.allotmentDate)

      : undefined) ?? resolveAllotmentDate(product, valuationDate);

  const maturityDate =

    (inputs.deskRow?.maturityDate != null

      ? parseExcelishDate(inputs.deskRow.maturityDate)

      : undefined) ??

    parseExcelishDate(product.maturityRaw ?? product.lastObservationDateRaw) ??

    new Date(valuationDate.getTime() + (product.tenorDays ?? 365) * 86400000);

  const observationDate =

    (inputs.deskRow?.observationDate != null

      ? parseExcelishDate(inputs.deskRow.observationDate)

      : undefined) ?? resolveWorkingObservationDate(product, valuationDate);



  const serials: WorkingSerialDates = {

    allotment: asSerial(inputs.deskRow?.allotmentDate, allotmentDate),

    valuation: toExcelSerial(valuationDate),

    maturity: asSerial(inputs.deskRow?.maturityDate, maturityDate),

    observation:

      inputs.deskRow?.observationDate != null && observationDate

        ? asSerial(inputs.deskRow.observationDate, observationDate)

        : observationDate

          ? toExcelSerial(observationDate)

          : undefined,

  };



  const serialDesk = {

    allotment: serials.allotment,

    valuation: serials.valuation,

    observation: serials.observation,

  };



  const expectedLevel = computeExpectedUnderlyingLevel(

    indexEntryLevel,

    currentLevel,

    allotmentDate,

    valuationDate,

    observationDate,

    serialDesk,

  );

  const performance = computeUnderlyingPerformance(indexEntryLevel, currentLevel, expectedLevel);



  const formula = (inputs.deskRow?.formulaText ?? product.formulaText)?.trim() || "Z";

  let formulaReturn = inputs.deskRow?.formulaReturn;

  if (formulaReturn == null || !Number.isFinite(formulaReturn)) {

    try {

      formulaReturn = evaluatePayoffFormula(formula, performance);

      if (!Number.isFinite(formulaReturn)) formulaReturn = 0;

    } catch {

      formulaReturn = 0;

    }

  }



  const finalValuation = computeWorkingFinalValuation(clientInvestment, formulaReturn, serials);



  const productValue = Math.max(finalValuation, clientInvestment);

  const absReturn = clientInvestment > 0 ? productValue / clientInvestment - 1 : formulaReturn;

  const totalAmount = productValue * debentures;



  const elapsedSerialDays = serials.valuation - serials.allotment;

  const elapsedDays = Math.max(1, elapsedSerialDays);

  const remainingTenorDays = Math.max(1, serials.maturity - serials.valuation);



  const productIrr = workingColumnY(productValue, clientInvestment, elapsedDays);



  return {

    productValue: Math.round(productValue),

    absReturn,

    productIrr,

    formulaReturn,

    z: performance,

    indexEntryLevel,

    currentLevel,

    totalAmount: Math.round(totalAmount),

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


