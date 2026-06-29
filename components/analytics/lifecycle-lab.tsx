"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

import { ChartStage, CategoryAxis, PremiumGrid, RechartsPremiumTooltip, barChartMargins } from "@/components/charts/chart-kit";
import { KpiBand, Panel, SectionTitle } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getCouponDistribution, getProtectionMix } from "@/lib/analytics";
import { getCouponPercent, classifyProtection } from "@/lib/product-utils";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { formatCrores, formatNumber, formatPercent } from "@/lib/utils";

const FILTERS: LifecycleFilter[] = ["ongoing", "expiring-3m", "expiring-1m", "expired"];

export function LifecycleAnalyticsGrid({ products }: { products: ProductRecord[] }) {
  const { asOf } = usePortfolioClock();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-purple-300">Lifecycle Category Analytics</p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>
      {FILTERS.map((filter) => (
        <LifecycleCategoryPanel key={filter} asOf={asOf} filter={filter} products={products} />
      ))}
    </div>
  );
}

function LifecycleCategoryPanel({
  products,
  filter,
  asOf,
}: {
  products: ProductRecord[];
  filter: LifecycleFilter;
  asOf: Date;
}) {
  const pool = useMemo(() => filterProductsByLifecycle(products, filter, asOf), [products, filter, asOf]);
  const liveNotional = useMemo(() => pool.reduce((s, p) => s + (p.tradeAmount ?? 0), 0), [pool]);
  const averageCoupon = useMemo(() => {
    const c = pool.map((p) => getCouponPercent(p)).filter((x): x is number => x !== undefined);
    return c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0;
  }, [pool]);
  const listedShare = pool.length ? pool.filter((p) => p.listing?.toLowerCase() === "listed").length / pool.length : 0;
  const protectedShare = pool.length
    ? pool.filter((p) => classifyProtection(p.principalProtection) === "protected").length / pool.length
    : 0;
  const coupons = useMemo(() => getCouponDistribution(pool), [pool]);
  const protection = useMemo(() => getProtectionMix(pool), [pool]);
  const label = LIFECYCLE_FILTER_LABELS[filter];

  if (pool.length === 0) return null;

  return (
    <HorizontalBand>
      <Panel className="!p-4" glow={filter === "expired" ? "purple" : "cyan"}>
        <SectionTitle>{label}</SectionTitle>
        <p className="mt-1 text-sm text-slate-500">{formatNumber(pool.length)} products · updated {asOf.toLocaleTimeString("en-IN")}</p>
        <div className="mt-4">
          <KpiBand
            accents={["cyan", "green", "purple", "amber"]}
            items={[
              { label: "AUM", value: formatCrores(liveNotional) },
              { label: "Avg Coupon", value: formatPercent(averageCoupon) },
              { label: "Listed", value: formatPercent(listedShare) },
              { label: "Protected", value: formatPercent(protectedShare) },
            ]}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartStage height="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coupons.filter((c) => c.value > 0)} margin={barChartMargins}>
                <PremiumGrid />
                <CategoryAxis dataKey="bucket" />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar dataKey="value" fill="#22d3ee" maxBarSize={36} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
          <div className="flex flex-wrap gap-2">
            {protection.map((slice) => (
              <div key={slice.name} className="spec-rail-card flex-1 min-w-[140px]">
                <p className="spec-rail-label">{slice.name}</p>
                <p className="spec-rail-value">{formatCrores(slice.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </HorizontalBand>
  );
}
