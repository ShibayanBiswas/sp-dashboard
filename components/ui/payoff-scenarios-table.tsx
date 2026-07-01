"use client";

import { memo } from "react";

import { DataTable, SectionTitle } from "@/components/layout/app-ui";
import type { PayoffRowFlags } from "@/lib/workbook/payoff-pivots";
import { cn, formatFormulaReturn, formatNumber, formatPercent } from "@/lib/utils";

export const PayoffScenariosTable = memo(function PayoffScenariosTable({ rows }: { rows: PayoffRowFlags[] }) {
  return (
    <div className="payoff-scenarios-stage rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/8 via-transparent to-maroon/5 p-1 shadow-[0_8px_32px_rgba(212,178,76,0.12)]">
      <div className="overflow-auto rounded-xl">
        <DataTable>
          <thead>
            <tr className="payoff-scenarios-head">
              <th>Final Fixing</th>
              <th>Underlying&apos;s Performance</th>
              <th>Product Returns</th>
              <th>XIRR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.performance}-${row.isPivot ? "p" : "b"}`}
                className={cn("payoff-scenario-row transition-colors", row.isPivot && "pivot-row font-semibold")}
              >
                <td>{formatNumber(row.finalFixing)}</td>
                <td>{formatPercent(row.performance, 1)}</td>
                <td className="font-bold text-emerald-800">{formatFormulaReturn(row.maturityValue)}</td>
                <td>{formatPercent(row.irr, 2)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
});
