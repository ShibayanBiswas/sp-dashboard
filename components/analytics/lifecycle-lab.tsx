"use client";

import { useMemo } from "react";

import { KpiBand, Panel, SectionTitle } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getCouponPercent, classifyProtection } from "@/lib/product-utils";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { formatCrores, formatNumber, formatPercent } from "@/lib/utils";

export function LifecycleAnalyticsGrid({
  products,
  filter = "ongoing",
}: {
  products: ProductRecord[];
  filter?: LifecycleFilter;
}) {
  const { asOf } = usePortfolioClock();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-purple-300">Lifecycle Category Analytics</p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>

      <LifecycleCategoryPanel asOf={asOf} filter={filter} products={products} />
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
  const label = LIFECYCLE_FILTER_LABELS[filter];

  if (pool.length === 0) {
    return (
      <Panel className="!p-5" glow="purple">
        <p className="text-center text-sm text-slate-400">No products in {label.toLowerCase()}.</p>
      </Panel>
    );
  }

  return (
    <HorizontalBand>
      <Panel className="!p-4" glow={filter === "expired" ? "purple" : "cyan"}>
        <SectionTitle>{label}</SectionTitle>
        <p className="mt-1 text-sm text-slate-500">
          {formatNumber(pool.length)} products · updated {asOf.toLocaleTimeString("en-IN")}
        </p>
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
      </Panel>
    </HorizontalBand>
  );
}
