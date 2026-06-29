"use client";

import { motion } from "framer-motion";

import { DataTable, SectionTitle } from "@/components/layout/app-ui";
import type { PayoffRowFlags } from "@/lib/workbook/payoff-pivots";
import { cn, formatFormulaReturn, formatNumber, formatPercent } from "@/lib/utils";

export function PayoffScenariosTable({ rows }: { rows: PayoffRowFlags[] }) {
  return (
    <div className="payoff-scenarios-stage rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-purple-500/[0.05] p-1 shadow-[0_0_48px_rgba(34,211,238,0.12)]">
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
            {rows.map((row, index) => (
              <motion.tr
                key={`${row.performance}-${row.isPivot ? "p" : ""}${row.isCurrent ? "c" : ""}`}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "payoff-scenario-row transition-all duration-300",
                  row.isPivot && "pivot-row font-semibold",
                  row.isCurrent && "current-row",
                )}
                initial={{ opacity: 0, x: -8 }}
                transition={{ delay: Math.min(index * 0.015, 0.45) }}
                whileHover={{ scale: 1.005 }}
              >
                <td>{formatNumber(row.finalFixing)}</td>
                <td>{formatPercent(row.performance, 1)}</td>
                <td className="font-bold text-emerald-300">{formatFormulaReturn(row.maturityValue)}</td>
                <td>{formatPercent(row.irr, 2)}</td>
              </motion.tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}
