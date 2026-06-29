"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

import {
  CategoryAxis,
  ChartStage,
  CrXAxis,
  CrYAxis,
  PremiumGrid,
  RechartsPremiumTooltip,
  barChartMargins,
  chartMargins,
  horizontalBarMargins,
} from "@/components/charts/chart-kit";
import { ChartPanel, Panel, SectionInfo, SectionTitle } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { SECTION_INFO } from "@/lib/section-info";
import {
  getCouponDistribution,
  getLifecycleChartData,
  getProtectionMix,
  getTenorDistribution,
  getUnderlyingExposure,
} from "@/lib/analytics";
import { chartTheme } from "@/lib/chart-theme";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { formatCrores } from "@/lib/utils";

export function ScienceLab({
  products,
  filter = "ongoing",
}: {
  products: ProductRecord[];
  filter?: LifecycleFilter;
}) {
  const { asOf } = usePortfolioClock();
  const pool = useMemo(() => filterProductsByLifecycle(products, filter, asOf), [products, filter, asOf]);
  const categoryLabel = LIFECYCLE_FILTER_LABELS[filter];

  const lifecycle = getLifecycleChartData(pool, asOf);
  const couponDist = getCouponDistribution(pool);
  const protection = getProtectionMix(pool);
  const underlyings = getUnderlyingExposure(pool).filter((u) => u.value > 0).slice(0, 3);
  const tenor = getTenorDistribution(pool, asOf);

  if (pool.length === 0) {
    return (
      <Panel className="!p-5" glow="purple">
        <p className="text-center text-sm text-slate-400">No analytics for {categoryLabel.toLowerCase()}.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-cyan-400">
          Analytics Laboratory · {categoryLabel}
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      <HorizontalBand>
        <ChartPanel glow="cyan" icon="chart" title="Lifecycle Universe">
          <SectionInfo {...SECTION_INFO["an-lifecycle"]} />
          <ChartStage height="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={chartMargins}>
                <Pie
                  animationDuration={1100}
                  cx="50%"
                  cy="46%"
                  data={lifecycle.filter((e) => e.count > 0).map((e) => ({ ...e, name: e.status }))}
                  dataKey="notional"
                  innerRadius={52}
                  nameKey="status"
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth={2}
                >
                  {lifecycle.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => {
                    const entry = lifecycle.find((e) => e.status === value);
                    const label = LIFECYCLE_STATUS_LABELS[String(value) as keyof typeof LIFECYCLE_STATUS_LABELS] ?? String(value);
                    return entry ? `${label} · ${entry.count} · ${formatCrores(entry.notional)}` : label;
                  }}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>

      <HorizontalBand>
        <ChartPanel glow="purple" icon="chart" title="Coupon Distribution">
          <SectionInfo {...SECTION_INFO["an-coupon"]} />
          <ChartStage height="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={couponDist} margin={barChartMargins}>
                <defs>
                  <linearGradient id="couponGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="55%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <PremiumGrid />
                <CategoryAxis dataKey="bucket" />
                <CrYAxis tickCount={5} />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar animationDuration={900} dataKey="value" fill="url(#couponGrad)" maxBarSize={42} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>

      <HorizontalBand>
        <ChartPanel glow="cyan" icon="chart" title="Principal Protection Mix">
          <SectionInfo {...SECTION_INFO["an-protection"]} />
          <ChartStage height="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={chartMargins}>
                <Pie
                  animationDuration={1000}
                  cx="50%"
                  cy="46%"
                  data={protection}
                  dataKey="value"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={4}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth={2}
                >
                  {protection.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => {
                    const entry = protection.find((p) => p.name === value);
                    return entry ? `${value} · ${formatCrores(entry.value)}` : String(value);
                  }}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>

      <HorizontalBand>
        <ChartPanel glow="purple" icon="chart" title={`Underlying Exposure · Top ${Math.max(underlyings.length, 1)}`}>
          <SectionInfo {...SECTION_INFO["an-underlying"]} />
          <ChartStage height="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                barCategoryGap="28%"
                barGap={8}
                data={underlyings}
                layout="vertical"
                margin={{ ...horizontalBarMargins, left: 8, right: 28, top: 16, bottom: 16 }}
              >
                <defs>
                  <linearGradient id="underlyingGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <PremiumGrid vertical={false} />
                <CrXAxis type="number" />
                <YAxis
                  axisLine={{ stroke: chartTheme.axisLine }}
                  dataKey="underlying"
                  interval={0}
                  tick={{ fill: chartTheme.tick, fontSize: 11, fontWeight: 600 }}
                  tickLine={{ stroke: chartTheme.axisLine }}
                  tickMargin={8}
                  type="category"
                  width={112}
                />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar animationDuration={800} dataKey="value" fill="url(#underlyingGrad)" maxBarSize={36} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>

      <HorizontalBand>
        <ChartPanel glow="cyan" icon="chart" title="Tenor Profile">
          <SectionInfo {...SECTION_INFO["an-tenor"]} />
          <ChartStage height="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenor} margin={barChartMargins}>
                <defs>
                  <linearGradient id="tenorGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e879f9" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <PremiumGrid />
                <CategoryAxis dataKey="bucket" />
                <CrYAxis tickCount={5} />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar animationDuration={850} dataKey="value" fill="url(#tenorGrad)" maxBarSize={48} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </HorizontalBand>
    </div>
  );
}
