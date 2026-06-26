"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatFormulaReturn, formatNumber } from "@/lib/utils";

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
    <div className="chart-tooltip whitespace-nowrap">
      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">
        Index move {formatFormulaReturn(Number(label), 0)}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {entry.name?.includes("Level") ? formatNumber(entry.value ?? 0) : formatFormulaReturn(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function PayoffUnderlyingChart({
  formula,
  title,
  entryLevel,
  marketMove = 0,
  compact,
}: {
  formula: string;
  title: string;
  entryLevel: number;
  /** Current index move (M/K − 1) — syncs slider with live Nifty level */
  marketMove?: number;
  compact?: boolean;
}) {
  const [zInput, setZInput] = useState(marketMove);

  useEffect(() => {
    setZInput(marketMove);
  }, [marketMove, formula]);

  const curve = useMemo(() => buildPayoffCurve(formula), [formula]);

  const comboData = useMemo(
    () =>
      curve.map((point) => ({
        z: point.z,
        payoff: point.payoff,
        underlyingLevel: entryLevel * (1 + point.z),
      })),
    [curve, entryLevel],
  );

  const payoffAtZ = evaluatePayoffFormula(formula, zInput);
  const underlyingAtZ = entryLevel * (1 + zInput);

  const payoffDomain = useMemo(() => {
    const values = comboData.map((p) => p.payoff);
    const min = Math.min(...values, -1);
    const max = Math.max(...values, 1);
    const pad = (max - min) * 0.08 || 0.1;
    return [Math.max(min - pad, -1.2), Math.min(max + pad, 3)] as [number, number];
  }, [comboData]);

  const charts = (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="label-chip mb-1.5">Index move (Z)</p>
          <InputGlow
            step="0.01"
            type="number"
            value={Number.isFinite(zInput) ? zInput : 0}
            onChange={(e) => setZInput(Number(e.target.value))}
          />
        </div>
        <div>
          <p className="label-chip mb-1.5">Underlying level</p>
          <OutputGlow accent="purple">{formatNumber(underlyingAtZ)}</OutputGlow>
        </div>
        <div>
          <p className="label-chip mb-1.5">Product return</p>
          <OutputGlow accent="cyan">{formatFormulaReturn(payoffAtZ)}</OutputGlow>
        </div>
      </div>

      <div className={compact ? "chart-stage chart-stage-compact" : "chart-stage"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 16, right: 12, left: 8, bottom: 28 }}>
            <defs>
              <linearGradient id="payoffGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.payoff} stopOpacity={0.45} />
                <stop offset="100%" stopColor={chartTheme.payoff} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.gridFine} strokeDasharray="2 10" />
            <ReferenceLine stroke="rgba(168,85,247,0.25)" strokeDasharray="6 6" y={0} yAxisId="payoff" />
            <XAxis
              axisLine={{ stroke: chartTheme.axisLine }}
              dataKey="z"
              height={36}
              label={{ value: "Index move", fill: chartTheme.tick, fontSize: 10, position: "insideBottom", offset: -4 }}
              tick={{ fill: chartTheme.tick, fontSize: 10 }}
              tickFormatter={(v) => formatFormulaReturn(v, 0)}
            />
            <YAxis
              domain={payoffDomain}
              hide
              yAxisId="payoff"
            />
            <YAxis hide orientation="right" yAxisId="underlying" />
            <Tooltip content={<PremiumTooltip />} />
            <ReferenceLine stroke="rgba(34,211,238,0.45)" strokeDasharray="4 4" x={zInput} yAxisId="payoff" />
            <Area
              activeDot={{ fill: chartTheme.payoff, r: 6, stroke: "#fff", strokeWidth: 2 }}
              animationDuration={1200}
              dataKey="payoff"
              fill="url(#payoffGradient)"
              name="Product return"
              stroke={chartTheme.payoff}
              strokeWidth={2.5}
              type="monotone"
              yAxisId="payoff"
            />
            <Line
              activeDot={{ fill: chartTheme.underlying, r: 5, stroke: "#fff", strokeWidth: 2 }}
              animationDuration={1400}
              dataKey="underlyingLevel"
              dot={false}
              name="Underlying level"
              stroke={chartTheme.underlying}
              strokeWidth={2}
              type="monotone"
              yAxisId="underlying"
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
            Product return curve
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-purple-500" />
            Underlying level
          </span>
          <span className="font-serif italic">
            Initial fixing: <strong className="not-italic text-white">{formatNumber(entryLevel)}</strong>
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
