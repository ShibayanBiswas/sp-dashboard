"use client";

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

import { CategoryRiskSpeedometerPanel } from "@/components/charts/category-risk-speedometer";
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
import { ChartPanel, DataTable, Panel, SectionInfo, SectionTitle } from "@/components/layout/app-ui";
import { SECTION_INFO } from "@/lib/section-info";
import {
  getCouponDistribution,
  getExpiredVsOngoingTable,
  getLifecycleChartData,
  getProtectionMix,
  getTenorDistribution,
  getUnderlyingExposure,
} from "@/lib/analytics";
import { chartTheme } from "@/lib/chart-theme";
import type { DashboardDataset, ProductRecord } from "@/lib/types";
import { formatCrores, formatNumber, formatPercent } from "@/lib/utils";

const lifecycleLabels: Record<string, string> = {
  ongoing: "Ongoing",
  expired: "Expired",
  perpetual: "Perpetual",
  upcoming: "Upcoming",
  "maturing-soon": "Maturing 90D",
  unknown: "Unknown",
};

export function ScienceLab({
  dataset,
  products,
}: {
  dataset: DashboardDataset;
  products: ProductRecord[];
}) {
  const lifecycle = getLifecycleChartData(products);
  const couponDist = getCouponDistribution(products);
  const protection = getProtectionMix(products);
  const underlyings = getUnderlyingExposure(products);
  const tenor = getTenorDistribution(products);
  const lifecycleTable = getExpiredVsOngoingTable(products);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-cyan-400">Analytics Laboratory</p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      <div className="grid gap-4">
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
                    const label = lifecycleLabels[String(value)] ?? String(value);
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
                <CrYAxis />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar
                  animationDuration={900}
                  dataKey="value"
                  fill="url(#couponGrad)"
                  maxBarSize={42}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>

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
      </div>

      <div className="grid gap-4">
        <ChartPanel glow="purple" icon="chart" title="Underlying Exposure">
          <SectionInfo {...SECTION_INFO["an-underlying"]} />
          <ChartStage height="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={underlyings} layout="vertical" margin={{ ...horizontalBarMargins, left: 96 }}>
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
                  tick={{ fill: chartTheme.tick, fontSize: 10, fontWeight: 600 }}
                  tickLine={{ stroke: chartTheme.axisLine }}
                  type="category"
                  width={88}
                />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar
                  animationDuration={800}
                  dataKey="value"
                  fill="url(#underlyingGrad)"
                  maxBarSize={22}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>

        <ChartPanel glow="cyan" icon="chart" title="Tenor Profile">
          <SectionInfo {...SECTION_INFO["an-tenor"]} />
          <ChartStage height="h-72">
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
                <CrYAxis />
                <RechartsPremiumTooltip formatter={(v) => formatCrores(Number(v))} />
                <Bar
                  animationDuration={850}
                  dataKey="value"
                  fill="url(#tenorGrad)"
                  maxBarSize={48}
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartStage>
        </ChartPanel>
      </div>

      <div className="grid gap-4">
        <ChartPanel glow="cyan" icon="chart" title="Category Risk Radar">
          <SectionInfo {...SECTION_INFO["an-radar"]} />
          <CategoryRiskSpeedometerPanel dataset={dataset} />
        </ChartPanel>
      </div>

      <Panel glow="purple">
        <SectionTitle>Ongoing Vs Expired Intelligence</SectionTitle>
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
                          backgroundColor:
                            lifecycle.find((e) => e.status === row.status)?.color ?? "#64748b",
                        }}
                      />
                      {lifecycleLabels[row.status] ?? row.status}
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
    </div>
  );
}
