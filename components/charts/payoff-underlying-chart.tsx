"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPanel, InputGlow, OutputGlow } from "@/components/layout/app-ui";
import { chartTheme } from "@/lib/chart-theme";
import { buildPayoffCurve, evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { formatNumber, formatPercent } from "@/lib/utils";

function PremiumTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Nifty move {formatPercent(Number(label))}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.name?.includes("Level") ? formatNumber(entry.value ?? 0) : formatPercent(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function PayoffUnderlyingChart({
  formula,
  title,
  entryLevel = 10000,
  compact,
}: {
  formula: string;
  title: string;
  entryLevel?: number;
  compact?: boolean;
  /** Formula used internally only — never rendered in UI */
}) {
  const [zInput, setZInput] = useState(0.1);
  const curve = useMemo(() => buildPayoffCurve(formula), [formula]);

  const comboData = useMemo(
    () =>
      curve.map((point) => ({
        z: point.z,
        payoff: point.payoff,
        underlyingLevel: entryLevel * (1 + point.z),
        underlyingReturn: point.z,
      })),
    [curve, entryLevel],
  );

  const payoffAtZ = evaluatePayoffFormula(formula, zInput);
  const underlyingAtZ = entryLevel * (1 + zInput);

  const charts = (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="label-chip mb-1.5">Nifty performance (Z)</p>
          <InputGlow type="number" step="0.01" value={zInput} onChange={(e) => setZInput(Number(e.target.value))} />
        </div>
        <div>
          <p className="label-chip mb-1.5">Underlying level</p>
          <OutputGlow accent="purple">{formatNumber(underlyingAtZ)}</OutputGlow>
        </div>
        <div>
          <p className="label-chip mb-1.5">Product payoff</p>
          <OutputGlow accent="cyan">{formatPercent(payoffAtZ)}</OutputGlow>
        </div>
      </div>

      <div className={compact ? "chart-stage chart-stage-compact" : "chart-stage"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="payoffGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.payoff} stopOpacity={0.45} />
                <stop offset="100%" stopColor={chartTheme.payoff} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.gridFine} strokeDasharray="2 10" />
            <CartesianGrid stroke={chartTheme.gridMajor} strokeDasharray="1 6" />
            <CartesianGrid stroke={chartTheme.gridMinor} strokeDasharray="4 8" />
            <ReferenceLine stroke="rgba(168,85,247,0.25)" strokeDasharray="6 6" y={0} yAxisId="payoff" />
            <XAxis
              dataKey="z"
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              tickFormatter={(v) => formatPercent(v, 0)}
            />
            <YAxis
              yAxisId="payoff"
              stroke={chartTheme.payoff}
              tick={{ fill: chartTheme.payoff, fontSize: 11 }}
              tickFormatter={(v) => formatPercent(v, 0)}
            />
            <YAxis
              hide={compact}
              orientation="right"
              stroke={chartTheme.underlying}
              tick={{ fill: chartTheme.underlying, fontSize: 11 }}
              yAxisId="underlying"
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip content={<PremiumTooltip />} />
            <ReferenceLine stroke="rgba(34,211,238,0.35)" strokeDasharray="4 4" x={zInput} />
            <Area
              animationDuration={1400}
              dataKey="payoff"
              fill="url(#payoffGradient)"
              stroke={chartTheme.payoff}
              strokeWidth={3}
              type="monotone"
              yAxisId="payoff"
              name="Payoff"
              activeDot={{ r: 7, fill: chartTheme.payoff, stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              animationDuration={1600}
              dataKey="underlyingLevel"
              dot={false}
              stroke={chartTheme.underlying}
              strokeWidth={2.5}
              type="monotone"
              yAxisId="underlying"
              name="Underlying level"
              activeDot={{ r: 6, fill: chartTheme.underlying, stroke: "#fff", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!compact ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-4 text-xs text-slate-400"
          initial={{ opacity: 0 }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 animate-pulse-glow rounded-full bg-cyan-400" />
            Payoff curve
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-purple-500" />
            Underlying level
          </span>
          <span className="font-serif italic">
            Entry: <strong className="not-italic text-white">{formatNumber(entryLevel)}</strong>
          </span>
        </motion.div>
      ) : null}
    </div>
  );

  if (compact) return <div className="chart-shell chart-stage-compact p-2">{charts}</div>;

  return (
    <ChartPanel glow="cyan" className="!p-4" icon="chart" title={`Payoff & Underlying — ${title}`}>
      {charts}
    </ChartPanel>
  );
}
