"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
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
import { ProductCombobox } from "@/components/ui/product-combobox";
import { ChartStage, CroreLacYAxis, DiagonalCategoryAxis, PremiumGrid, RechartsPremiumTooltip, chartMargins } from "@/components/charts/chart-kit";
import { getMaturityLadder, getPortfolioHeadlineStats } from "@/lib/analytics";
import { chartTheme, categoryNeon } from "@/lib/chart-theme";
import {
  filterProductsByLifecycle,
  type LifecycleFilter,
  LIFECYCLE_FILTER_LABELS,
} from "@/lib/product-lifecycle";
import { useDataset } from "@/lib/context/dataset-provider";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { formatCrores, formatNumber } from "@/lib/utils";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

export function DashboardShell() {
  const { dataset, isLoading, uploadWorkbook } = useDataset();
  const selection = useProductSelection();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");
  const filteredProducts = useMemo(
    () => filterProductsByLifecycle(dataset.products, lifecycle),
    [dataset.products, lifecycle],
  );

  const summary = getPortfolioHeadlineStats(dataset);
  const maturityLadder = getMaturityLadder(filteredProducts);

  return (
    <AppPage
      actions={
        <label className="cursor-pointer">
          <Button variant="primary">{isLoading ? "Uploading..." : "Upload Master"}</Button>
          <input
            accept=".xlsx,.xlsm"
            className="hidden"
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadWorkbook(file);
            }}
          />
        </label>
      }
      dense
      title="Home"
    >
      <HorizontalBand>
        <SectionInfo {...SECTION_INFO["home-kpis"]} />
      </HorizontalBand>

      <HorizontalBand className="mt-1">
        <KpiBand
          accents={["cyan", "green", "purple", "amber"]}
          items={[
            { label: "Live Notional", value: formatCrores(summary.liveNotional) },
            { label: "Active", value: formatNumber(summary.activeCount) },
            { label: "Expired", value: formatNumber(summary.expiredCount) },
            { label: "Maturing 90D", value: formatNumber(summary.maturingSoon) },
          ]}
        />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["home-filter"]} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Portfolio Filter</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIFECYCLE_FILTER_LABELS) as LifecycleFilter[]).map((key) => (
                <Button
                  key={key}
                  active={lifecycle === key}
                  variant="pill"
                  onClick={() => setLifecycle(key)}
                >
                  {LIFECYCLE_FILTER_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionTitle>Product Search</SectionTitle>
          <div className="mt-3">
            <ProductCombobox
              products={filteredProducts}
              value={selection.productName}
              onSelect={(p) => selection.selectProduct(p)}
            />
          </div>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <ChartPanel glow="cyan" icon="chart" title="Maturity Ladder">
          <SectionInfo {...SECTION_INFO["home-maturity"]} />
          <ChartStage height="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityLadder} margin={{ ...chartMargins, bottom: 28 }}>
                <PremiumGrid />
                <DiagonalCategoryAxis dataKey="bucket" title="Maturity Window" />
                <CroreLacYAxis />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar animationDuration={900} dataKey="value" fill={chartTheme.payoff} maxBarSize={48} radius={[6, 6, 0, 0]} />
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
              <Link href={"/products" as Route}>
                <Button className="w-full">Portfolio</Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[200px]">
              <Link href={"/intelligence" as Route}>
                <Button className="w-full">Logic Atlas</Button>
              </Link>
            </RailCard>
          </HorizontalRail>
        </Panel>
      </HorizontalBand>
    </AppPage>
  );
}
