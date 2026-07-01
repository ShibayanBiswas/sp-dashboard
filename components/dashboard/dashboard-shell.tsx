"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import { LifecycleProductList } from "@/components/dashboard/lifecycle-product-list";
import { LifecycleAnalyticsGrid } from "@/components/analytics/lifecycle-lab";
import { LifecycleIntelligencePanel } from "@/components/analytics/lifecycle-intelligence";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
import { MasterUploadButton } from "@/components/ui/master-upload-button";
import {
  AppPage,
  Button,
  ChartPanel,
  KpiBand,
  Panel,
  SectionInfo,
  SectionTitle,
} from "@/components/layout/app-ui";
import { SECTION_INFO } from "@/lib/section-info";
import { ChartStage, CroreLacYAxis, DiagonalCategoryAxis, PremiumGrid, RechartsPremiumTooltip, barChartMargins } from "@/components/charts/chart-kit";
import { getMaturityLadder, getPortfolioHeadlineStats } from "@/lib/analytics";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import {
  filterProductsByLifecycle,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { useDataset } from "@/lib/context/dataset-provider";
import { useMasterProducts } from "@/lib/hooks/use-master-products";
import { formatCrores, formatNumber } from "@/lib/utils";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

export function DashboardShell() {
  const { dataset } = useDataset();
  const masterProducts = useMasterProducts();
  const { asOf } = usePortfolioClock();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");
  const filteredProducts = useMemo(
    () => filterProductsByLifecycle(masterProducts, lifecycle, asOf),
    [masterProducts, lifecycle, asOf],
  );

  const summary = useMemo(
    () => getPortfolioHeadlineStats({ ...dataset, products: masterProducts }, asOf),
    [dataset, masterProducts, asOf],
  );
  const maturityLadder = getMaturityLadder(filteredProducts, asOf);

  return (
    <AppPage
      actions={<MasterUploadButton />}
      dense
    >
      <HorizontalBand>
        <SectionInfo {...SECTION_INFO["home-kpis"]} />
      </HorizontalBand>

      <HorizontalBand className="mt-1">
        <KpiBand
          accents={["cyan", "green", "purple", "amber", "rose"]}
          items={[
            { label: "Live Notional", value: formatCrores(summary.liveNotional) },
            { label: "Ongoing", value: formatNumber(summary.ongoingCount) },
            { label: "Expiring in 3M", value: formatNumber(summary.maturingSoon) },
            { label: "Expiring in 1M", value: formatNumber(summary.expiring1m) },
            { label: "Expired", value: formatNumber(summary.expiredCount) },
          ]}
        />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <LifecycleProductList
          filter={lifecycle}
          products={masterProducts}
          onFilterChange={setLifecycle}
        />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <LifecycleAnalyticsGrid filter={lifecycle} products={masterProducts} />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <LifecycleIntelligencePanel filter={lifecycle} products={masterProducts} />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <ChartPanel glow="cyan" icon="chart" subtitle="Notional by maturity window for the active lifecycle tab" title="Maturity Ladder">
          <SectionInfo {...SECTION_INFO["home-maturity"]} />
          <ChartStage height="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityLadder} margin={barChartMargins}>
                <defs>
                  <linearGradient id="maturityGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e5cf94" />
                    <stop offset="55%" stopColor="#d4b24c" />
                    <stop offset="100%" stopColor="#7a1e2c" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <PremiumGrid />
                <DiagonalCategoryAxis dataKey="bucket" title="Maturity Window" />
                <CroreLacYAxis tickCount={6} width={96} />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar
                  animationDuration={900}
                  dataKey="value"
                  fill="url(#maturityGrad)"
                  maxBarSize={52}
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["home-modules"]} />
          <SectionTitle>Desk Modules</SectionTitle>
          <HorizontalRail className="mt-4">
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/valuation" as Route}>
                <Button className="w-full" variant="primary">
                  Valuation
                </Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/payoff" as Route}>
                <Button className="w-full" variant="primary">
                  Payoff
                </Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/portfolio/details" as Route}>
                <Button className="w-full">Product Details</Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/portfolio/analytics" as Route}>
                <Button className="w-full">Analytics</Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/intelligence" as Route}>
                <Button className="w-full">Intel · Logic Atlas</Button>
              </Link>
            </RailCard>
          </HorizontalRail>
        </Panel>
      </HorizontalBand>
    </AppPage>
  );
}
