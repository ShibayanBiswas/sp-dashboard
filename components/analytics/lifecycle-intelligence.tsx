"use client";

import { useMemo } from "react";

import { DataTable, Panel, SectionTitle } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getExpiredVsOngoingTable, getLifecycleChartData } from "@/lib/analytics";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { formatCrores, formatNumber, formatPercent } from "@/lib/utils";

export function LifecycleIntelligencePanel({
  products,
  filter = "ongoing",
}: {
  products: ProductRecord[];
  filter?: LifecycleFilter;
}) {
  const { asOf } = usePortfolioClock();
  const pool = useMemo(() => filterProductsByLifecycle(products, filter, asOf), [products, filter, asOf]);
  const categoryLabel = LIFECYCLE_FILTER_LABELS[filter];
  const lifecycle = getLifecycleChartData(pool);
  const lifecycleTable = getExpiredVsOngoingTable(pool);

  if (pool.length === 0) {
    return (
      <Panel className="!p-5" glow="purple">
        <p className="text-center text-sm text-slate-400">No lifecycle intelligence for {categoryLabel.toLowerCase()}.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-purple-300">
          Lifecycle Intelligence · {categoryLabel}
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>

      <HorizontalBand>
        <Panel glow="purple">
          <SectionTitle>Lifecycle Intelligence</SectionTitle>
          <p className="mt-1 text-sm text-slate-500">
            Status breakdown within {categoryLabel.toLowerCase()} · updated {asOf.toLocaleTimeString("en-IN")}
          </p>
          <div className="mt-4">
            <DataTable>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Notional</th>
                  <th>Avg Coupon</th>
                </tr>
              </thead>
              <tbody>
                {lifecycleTable.map((row) => (
                  <tr key={row.status}>
                    <td>
                      <span className="inline-flex items-center gap-2 font-semibold capitalize">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: lifecycle.find((e) => e.status === row.status)?.color ?? "#64748b",
                          }}
                        />
                        {LIFECYCLE_STATUS_LABELS[row.status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? row.status}
                      </span>
                    </td>
                    <td>{formatNumber(row.count)}</td>
                    <td>{formatCrores(row.notional)}</td>
                    <td>{formatPercent(row.avgCoupon)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Panel>
      </HorizontalBand>
    </div>
  );
}
