import { getDebenturePrice, getIndexEntryLevel } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { findPayoffPlotKinks } from "@/lib/workbook/payoff-kinks";
import { irrFromReturn } from "@/lib/workbook/irr";
import {
  buildPayoffScenarioTable,
  type PayoffInputs,
  type PayoffScenarioRow,
  PAYOFF_SCENARIO_OFFSETS,
} from "@/lib/workbook/payoff-scenarios";

export type PayoffRowFlags = PayoffScenarioRow & {
  isPivot?: boolean;
  isCurrent?: boolean;
};

/** Detect Z levels where payoff slope changes sharply (formula kinks / IF boundaries). */
export function findPayoffPivotZs(formula: string, zMin = -0.55, zMax = 1.3): number[] {
  return findPayoffPlotKinks(formula, zMin, zMax);
}

function rowForPerformance(
  product: ProductRecord,
  performance: number,
  inputs: PayoffInputs,
): PayoffScenarioRow {
  const initialFixing = getIndexEntryLevel(product);
  const debentures = inputs.debentures ?? 100;
  const pricePerDebenture = inputs.pricePerDebenture ?? getDebenturePrice(product);
  const investment = debentures * pricePerDebenture;
  const formula = product.formulaText ?? "Z";
  const productReturn = evaluatePayoffFormula(formula, performance);
  const tenor = inputs.remainingTenorDays ?? 365;
  return {
    performance,
    finalFixing: initialFixing * (1 + performance),
    z: performance,
    maturityValue: productReturn,
    maturityAmount: investment * (1 + productReturn),
    returnOnInvestment: productReturn,
    irr: irrFromReturn(productReturn, tenor),
  };
}

/** Excel scenario rows + formula pivot points + live market-move row. */
export function buildEnhancedPayoffScenarioTable(
  product: ProductRecord,
  inputs: PayoffInputs,
  marketMove?: number,
): PayoffRowFlags[] {
  const base = buildPayoffScenarioTable(product, inputs);
  const formula = product.formulaText ?? "";
  const plotKinks = findPayoffPlotKinks(formula);
  const extraPerformances = new Set<number>([
    ...plotKinks,
    ...(marketMove != null && Number.isFinite(marketMove) ? [marketMove] : []),
  ]);

  for (const perf of PAYOFF_SCENARIO_OFFSETS) {
    extraPerformances.delete(perf);
  }

  const merged = new Map<number, PayoffRowFlags>();
  for (const row of base) {
    merged.set(Math.round(row.performance * 10000) / 10000, { ...row });
  }

  for (const perf of extraPerformances) {
    const key = Math.round(perf * 10000) / 10000;
    if (!merged.has(key)) {
      merged.set(key, { ...rowForPerformance(product, perf, inputs), isPivot: true });
    }
  }

  const rows = [...merged.values()].sort((a, b) => b.performance - a.performance);

  if (marketMove != null && Number.isFinite(marketMove)) {
    let closest = rows[0];
    let minDist = Infinity;
    for (const row of rows) {
      const d = Math.abs(row.performance - marketMove);
      if (d < minDist) {
        minDist = d;
        closest = row;
      }
    }
    for (const row of rows) row.isCurrent = false;
    if (closest) closest.isCurrent = true;
    if (minDist > 0.005) {
      rows.push({
        ...rowForPerformance(product, marketMove, inputs),
        isCurrent: true,
        isPivot: false,
      });
      rows.sort((a, b) => b.performance - a.performance);
    }
  }

  const anchorKeys = new Set(PAYOFF_SCENARIO_OFFSETS.map((p) => Math.round(p * 10000)));
  for (const row of rows) {
    const key = Math.round(row.performance * 10000);
    row.isPivot = plotKinks.some((k) => Math.abs(k - row.performance) < 0.004) && !anchorKeys.has(key);
  }

  return rows;
}
