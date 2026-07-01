"use client";

import { useMemo } from "react";

import { DataTable, Panel, SectionTitle } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getExpiredVsOngoingTable, getLifecycleChartData, getLifecycleTableTotals } from "@/lib/analytics";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  LIFECYCLE_STATUS_LABELS,
  lifecycleStatusMatchesFilter,
  type LifecycleFilter,
  type LifecycleStatus,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { cn, formatCrores, formatNumber, formatPercent } from "@/lib/utils";

export function LifecycleIntelligencePanel({
  products,
  filter = "ongoing",
}: {
  products: ProductRecord[];
  filter?: LifecycleFilter;
}) {
  const { asOf } = usePortfolioClock();
  const categoryLabel = LIFECYCLE_FILTER_LABELS[filter];
  const tabPool = useMemo(() => filterProductsByLifecycle(products, filter, asOf), [products, filter, asOf]);
  const tabTotals = useMemo(() => getLifecycleTableTotals(tabPool, asOf), [tabPool, asOf]);
  const lifecycleTable = useMemo(() => getExpiredVsOngoingTable(products, asOf), [products, asOf]);
  const lifecycle = useMemo(() => getLifecycleChartData(products, asOf), [products, asOf]);
  const bookTotals = useMemo(() => getLifecycleTableTotals(products, asOf), [products, asOf]);

  if (products.length === 0) {
    return (
      <Panel className="!p-5" glow="purple">
        <p className="text-center text-sm text-stone-600">No lifecycle intelligence available.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-maroon/40 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-maroon">
          Lifecycle Intelligence · {categoryLabel}
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      <HorizontalBand>
        <Panel glow="purple">
          <SectionTitle>Lifecycle Intelligence</SectionTitle>
          <p className="mt-1 text-sm text-stone-500">
            Full book status breakdown · {categoryLabel} tab: {formatNumber(tabTotals.count)} products ·{" "}
            {formatCrores(tabTotals.notional)} AUM · updated {asOf.toLocaleTimeString("en-IN")}
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
                {lifecycleTable.map((row) => {
                  const inActiveTab = lifecycleStatusMatchesFilter(row.status as LifecycleStatus, filter);
                  return (
                    <tr
                      key={row.status}
                      className={cn(inActiveTab && "bg-gold/[0.07] ring-1 ring-inset ring-gold/25")}
                    >
                      <td>
                        <span className="inline-flex items-center gap-2 font-semibold capitalize">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: lifecycle.find((e) => e.status === row.status)?.color ?? "#64748b",
                            }}
                          />
                          {LIFECYCLE_STATUS_LABELS[row.status as keyof typeof LIFECYCLE_STATUS_LABELS] ?? row.status}
                          {inActiveTab ? (
                            <span className="rounded-full border border-gold/35 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-dark">
                              In tab
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td>{formatNumber(row.count)}</td>
                      <td>{formatCrores(row.notional)}</td>
                      <td>{formatPercent(row.avgCoupon)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gold/30 bg-stone-50 font-semibold">
                  <td>Total book</td>
                  <td>{formatNumber(bookTotals.count)}</td>
                  <td>{formatCrores(bookTotals.notional)}</td>
                  <td>{formatPercent(bookTotals.avgCoupon)}</td>
                </tr>
              </tbody>
            </DataTable>
          </div>
        </Panel>
      </HorizontalBand>
    </div>
  );
}
