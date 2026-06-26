import { getEntryLevel, getFaceValue } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";

export interface PayoffInputs {
  currentLevel?: number;
  debentures?: number;
  pricePerDebenture?: number;
  remainingTenorDays?: number;
}

export interface PayoffScenarioRow {
  performance: number;
  finalFixing: number;
  z: number;
  maturityValue: number;
  maturityAmount: number;
  returnOnInvestment: number;
  irr: number;
}

const SCENARIO_OFFSETS = [
  1, 0.7, 0.5, 0.4, 0.37, 0.34, 0.3, 0.25, 0.2, 0.1, 0, -0.1, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4,
];

export function buildPayoffScenarioTable(product: ProductRecord, inputs: PayoffInputs): PayoffScenarioRow[] {
  const entryLevel = getEntryLevel(product);
  const faceValue = getFaceValue(product);
  const debentures = inputs.debentures ?? 100;
  const pricePerDebenture = inputs.pricePerDebenture ?? faceValue;
  const investment = debentures * pricePerDebenture;
  const anchorLevel = inputs.currentLevel ?? entryLevel;
  const remainingTenorDays = inputs.remainingTenorDays ?? product.tenorDays ?? 365;
  const formula = product.formulaText ?? "Z";

  return SCENARIO_OFFSETS.map((performance) => {
    const finalFixing = anchorLevel * (1 + performance);
    const z = entryLevel > 0 ? finalFixing / entryLevel - 1 : performance;
    const maturityValue = evaluatePayoffFormula(formula, z);
    const maturityAmount = (1 + maturityValue) * debentures * faceValue;
    const returnOnInvestment = investment > 0 ? maturityAmount / investment - 1 : maturityValue;
    const irr =
      remainingTenorDays > 0 && returnOnInvestment > -1
        ? Math.pow(1 + returnOnInvestment, 365 / remainingTenorDays) - 1
        : 0;

    return {
      performance,
      finalFixing,
      z,
      maturityValue,
      maturityAmount,
      returnOnInvestment,
      irr,
    };
  });
}
