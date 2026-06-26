import { getFaceValue, getIndexEntryLevel, parseNumericField, rawField } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { irrFromReturn } from "@/lib/workbook/irr";

export interface PayoffInputs {
  /** Optional override for scenario anchor — defaults to master Initial Fixing. */
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

/** Excel Non-PP SP Details column G — underlying performance sweep. */
export const PAYOFF_SCENARIO_OFFSETS = [
  1, 0.7, 0.5, 0.41, 0.4, 0.37, 0.34, 0.33, 0.2, 0.1, 0, -0.1, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4,
];

export function getPayoffTenorDays(product: ProductRecord) {
  return (
    parseNumericField(rawField(product, "Payoff Tenor(Days)", "Payoff Tenor (Days)", "Payoff Tenor")) ??
    product.tenorDays ??
    365
  );
}

/**
 * Primary Payoff table parity:
 * F = InitialFixing × (1 + G) · G → Z in formula · H = ProductReturn · I = (1+H)^(365/D22)−1
 */
export function buildPayoffScenarioTable(product: ProductRecord, inputs: PayoffInputs): PayoffScenarioRow[] {
  const initialFixing = getIndexEntryLevel(product);
  const debentures = inputs.debentures ?? 100;
  const pricePerDebenture = inputs.pricePerDebenture ?? product.pricePerDebenture ?? getFaceValue(product);
  const investment = debentures * pricePerDebenture;
  const payoffTenorDays = inputs.remainingTenorDays ?? getPayoffTenorDays(product);
  const formula = product.formulaText ?? "Z";

  return PAYOFF_SCENARIO_OFFSETS.map((performance) => {
    const finalFixing = initialFixing * (1 + performance);
    const z = performance;
    const productReturn = evaluatePayoffFormula(formula, z);
    const maturityAmount = investment * (1 + productReturn);
    const irr = irrFromReturn(productReturn, payoffTenorDays);

    return {
      performance,
      finalFixing,
      z,
      maturityValue: productReturn,
      maturityAmount,
      returnOnInvestment: productReturn,
      irr,
    };
  });
}
