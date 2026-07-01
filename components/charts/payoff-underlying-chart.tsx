"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPanel, InputGlow, OutputGlow } from "@/components/layout/app-ui";
import { PremiumGrid } from "@/components/charts/chart-kit";
import { chartTheme } from "@/lib/chart-theme";
import { buildPayoffCurve, evaluatePayoffFormula } from "@/lib/workbook/formula-engine";
import { findPayoffPlotKinks } from "@/lib/workbook/payoff-kinks";
import { formatFormulaReturn, formatNumber } from "@/lib/utils";

type TooltipRow = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
};

function formatTooltipValue(entry: TooltipRow) {
  const key = String(entry.dataKey ?? "");
  const name = String(entry.name ?? "");
  if (key === "underlyingLevel" || /underlying/i.test(name)) {
    return formatNumber(entry.value ?? 0, 2);
  }
  return formatFormulaReturn(entry.value ?? 0, 2);
}

function PayoffTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip chart-tooltip-animated whitespace-nowrap">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-dark">
        Index move {formatFormulaReturn(Number(label), 1)}
      </p>
      {payload.map((entry) => (
        <p key={`${entry.dataKey}-${entry.name}`} className="mt-1 text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatTooltipValue(entry)}
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
  marketMove?: number;
  compact?: boolean;
}) {
  const [zInput, setZInput] = useState(marketMove);

  useEffect(() => {
    setZInput(marketMove);
  }, [marketMove, formula]);

  const curve = useMemo(() => {
    const raw = buildPayoffCurve(formula);
    return raw.map((point) => ({
      ...point,
      payoff: Math.max(-1, Math.min(point.payoff, 3)),
    }));
  }, [formula]);

  const comboData = useMemo(
    () =>
      curve.map((point) => ({
        z: point.z,
        payoff: point.payoff,
        underlyingLevel: entryLevel * (1 + point.z),
      })),
    [curve, entryLevel],
  );

  const kinkPoints = useMemo(() => findPayoffPlotKinks(formula), [formula]);

  const payoffAtZ = evaluatePayoffFormula(formula, zInput);
  const underlyingAtZ = entryLevel * (1 + zInput);

  const payoffDomain = useMemo(() => {
    const values = comboData.map((p) => p.payoff);
    const min = Math.min(...values, -0.5);
    const max = Math.max(...values, 0.5);
    const pad = Math.max((max - min) * 0.12, 0.08);
    return [min - pad, max + pad] as [number, number];
  }, [comboData]);

  const underlyingDomain = useMemo(() => {
    const levels = comboData.map((p) => p.underlyingLevel);
    const min = Math.min(...levels, entryLevel * 0.6);
    const max = Math.max(...levels, entryLevel * 1.5);
    const pad = (max - min) * 0.06;
    return [min - pad, max + pad] as [number, number];
  }, [comboData, entryLevel]);

  const charts = (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <p className="label-chip mb-1.5">Index move</p>
          <InputGlow
            step="0.01"
            type="number"
            value={Number.isFinite(zInput) ? Number(zInput.toFixed(3)) : 0}
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

      <div className={compact ? "chart-stage chart-stage-compact" : "chart-stage h-[min(52vh,420px)] min-h-[280px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={comboData}
            margin={{ top: 20, right: 58, left: 54, bottom: 36 }}
          >
            <defs>
              <linearGradient id="payoffGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.payoff} stopOpacity={0.55} />
                <stop offset="100%" stopColor={chartTheme.payoff} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="underlyingStroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#7a1e2c" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
            <PremiumGrid yAxisId="payoff" />
            <ReferenceLine stroke="rgba(122,30,44,0.35)" strokeDasharray="4 4" y={0} yAxisId="payoff" />
            <XAxis
              axisLine={{ stroke: chartTheme.axisLine }}
              dataKey="z"
              height={40}
              label={{
                value: "Underlying performance",
                fill: chartTheme.tick,
                fontSize: 11,
                fontWeight: 600,
                position: "insideBottom",
                offset: -2,
              }}
              tick={{ fill: chartTheme.tick, fontSize: 10 }}
              tickFormatter={(v) => formatFormulaReturn(v, 0)}
            />
            <YAxis
              axisLine={{ stroke: chartTheme.payoff }}
              domain={payoffDomain}
              label={{
                value: "Product return",
                angle: -90,
                position: "insideLeft",
                fill: chartTheme.payoff,
                fontSize: 10,
                fontWeight: 600,
                offset: 8,
              }}
              tick={{ fill: chartTheme.payoff, fontSize: 10 }}
              tickFormatter={(v) => formatFormulaReturn(v, 0)}
              tickLine={{ stroke: chartTheme.payoff, strokeOpacity: 0.35 }}
              width={50}
              yAxisId="payoff"
            />
            <YAxis
              axisLine={{ stroke: chartTheme.underlying }}
              domain={underlyingDomain}
              label={{
                value: "Index level",
                angle: 90,
                position: "insideRight",
                fill: chartTheme.underlying,
                fontSize: 10,
                fontWeight: 600,
                offset: 10,
              }}
              orientation="right"
              tick={{ fill: chartTheme.underlying, fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v, 0)}
              tickLine={{ stroke: chartTheme.underlying, strokeOpacity: 0.35 }}
              width={52}
              yAxisId="underlying"
            />
            <Tooltip
              content={<PayoffTooltip />}
              cursor={{ stroke: "rgba(212,178,76,0.55)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <ReferenceLine stroke="rgba(212,178,76,0.55)" strokeDasharray="4 4" x={zInput} yAxisId="payoff" />
            {kinkPoints.map((z) => (
              <ReferenceDot
                key={z}
                fill="#b45309"
                r={6}
                stroke="#fff"
                strokeWidth={2}
                x={z}
                y={evaluatePayoffFormula(formula, z)}
                yAxisId="payoff"
              />
            ))}
            <Area
              activeDot={{ fill: chartTheme.payoff, r: 6, stroke: "#fff", strokeWidth: 2 }}
              animationDuration={1000}
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
              animationDuration={1200}
              dataKey="underlyingLevel"
              dot={false}
              name="Underlying level"
              stroke="url(#underlyingStroke)"
              strokeWidth={2.5}
              type="monotone"
              yAxisId="underlying"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!compact ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-4 text-xs text-stone-600"
          initial={{ opacity: 0 }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-gold shadow-[0_0_8px_rgba(212,178,76,0.6)]" />
            Product return (left axis)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-maroon shadow-[0_0_8px_rgba(122,30,44,0.5)]" />
            Index level (right axis)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-700 ring-2 ring-white" />
            Plot kinks — slope turns
          </span>
          <span className="font-serif italic text-stone-700">
            Initial fixing: <strong className="not-italic text-ink">{formatNumber(entryLevel)}</strong>
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
