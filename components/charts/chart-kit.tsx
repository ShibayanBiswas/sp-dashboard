"use client";



import type { ReactNode } from "react";

import { motion } from "framer-motion";

import { CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";



import { chartTheme } from "@/lib/chart-theme";

import { formatChartAxisMoney, formatCrores, formatPercent, stripLabelParens } from "@/lib/utils";



/** Default margins — left gutter sized for ₹ axis labels (never clip). */

export const chartMargins = { top: 18, right: 20, left: 80, bottom: 8 };



/** Bar charts with category X-axis + money Y-axis — extra left gutter for ₹ ticks. */

export const barChartMargins = { top: 22, right: 24, left: 96, bottom: 40 };



/** Horizontal bar charts (underlying exposure). */

export const horizontalBarMargins = { top: 12, right: 24, left: 8, bottom: 12 };



export function PremiumGrid({ vertical = true }: { vertical?: boolean }) {

  return (

    <>

      <CartesianGrid stroke={chartTheme.gridFine} strokeDasharray="2 10" vertical={vertical} horizontal />

      <CartesianGrid stroke={chartTheme.gridMajor} strokeDasharray="1 6" vertical={vertical} horizontal />

      <CartesianGrid stroke={chartTheme.gridMinor} strokeDasharray="4 8" vertical={vertical} horizontal />

      <ReferenceLine stroke="rgba(34,211,238,0.2)" strokeDasharray="6 6" y={0} />

    </>

  );

}



const crAxisLabel = {

  value: "NOTIONAL ₹ CRORE",

  fill: chartTheme.tick,

  fontSize: 10,

  fontWeight: 700,

};



interface MoneyTickProps {

  x?: number;

  y?: number;

  payload?: { value: number | string };

}



/** Single-line SVG tick — Recharts default splits strings on spaces. */

function MoneyAxisTick({ x = 0, y = 0, payload }: MoneyTickProps) {

  const label = formatChartAxisMoney(Number(payload?.value ?? 0));

  return (

    <text

      fill={chartTheme.tick}

      fontSize={10}

      fontWeight={600}

      textAnchor="end"

      x={x}

      y={y}

      dy={4}

    >

      {label}

    </text>

  );

}



export function CrYAxis({

  dataKey = "value",

  width = 80,

  tickCount = 5,

  ...props

}: {

  dataKey?: string;

  width?: number;

  tickCount?: number;

} & React.ComponentProps<typeof YAxis>) {

  return (

    <YAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      dataKey={dataKey}

      label={{ ...crAxisLabel, angle: -90, position: "insideLeft", offset: 8, dx: -8 }}

      tick={<MoneyAxisTick />}

      tickCount={tickCount}

      tickLine={{ stroke: chartTheme.axisLine }}

      width={width}

    />

  );

}



export function CrXAxis({

  dataKey = "value",

  ...props

}: { dataKey?: string } & React.ComponentProps<typeof XAxis>) {

  return (

    <XAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      dataKey={dataKey}

      height={48}

      label={{ ...crAxisLabel, position: "insideBottom", offset: -2 }}

      tick={<MoneyAxisTick />}

      tickLine={{ stroke: chartTheme.axisLine }}

    />

  );

}



export function CategoryAxis(props: React.ComponentProps<typeof XAxis>) {

  return (

    <XAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      tick={{ fill: chartTheme.tick, fontSize: 10, fontWeight: 600 }}

      tickLine={{ stroke: chartTheme.axisLine }}

    />

  );

}



interface DiagonalTickProps {

  x?: number;

  y?: number;

  payload?: { value: string | number };

  formatter?: (value: string | number) => string;

  angle?: number;

  anchorEnd?: boolean;

}



/** Renders an axis tick label rotated diagonally for dense / long labels. */

export function DiagonalTick({ x = 0, y = 0, payload, formatter, angle = -32, anchorEnd = true }: DiagonalTickProps) {

  const raw = payload?.value ?? "";

  const text = formatter ? formatter(raw) : String(raw);

  return (

    <g transform={`translate(${x},${y})`}>

      <text

        dx={anchorEnd ? -2 : 4}

        dy={anchorEnd ? 4 : 12}

        fill={chartTheme.tick}

        fontSize={10}

        fontWeight={600}

        textAnchor="end"

        transform={`rotate(${angle})`}

      >

        {text}

      </text>

    </g>

  );

}



const axisTitle = (value: string, position: "insideBottom" | "insideLeft") => ({

  value: stripLabelParens(value),

  fill: chartTheme.tick,

  fontSize: 10,

  fontWeight: 700,

  position,

  ...(position === "insideLeft" ? { angle: -90 as const, offset: 0 } : { offset: 0 }),

});



/** Category X-axis with diagonal labels and an axis title (e.g. maturity windows). */

export function DiagonalCategoryAxis({

  title,

  ...props

}: { title?: string } & React.ComponentProps<typeof XAxis>) {

  return (

    <XAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      height={64}

      interval={0}

      label={title ? axisTitle(title, "insideBottom") : undefined}

      tick={<DiagonalTick />}

      tickLine={{ stroke: chartTheme.axisLine }}

    />

  );

}



/** Value Y-axis — single-line ₹ ticks (maturity ladder, tenor profile). */

export function CroreLacYAxis({

  title = "NOTIONAL ₹",

  width = 96,

  tickCount = 5,

  ...props

}: { title?: string; width?: number; tickCount?: number } & React.ComponentProps<typeof YAxis>) {

  return (

    <YAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      interval={0}

      label={{ ...axisTitle(title, "insideLeft"), offset: 10, dx: -8 }}

      tick={<MoneyAxisTick />}

      tickCount={tickCount}

      tickLine={{ stroke: chartTheme.axisLine }}

      width={width}

    />

  );

}



export function PercentYAxis(props: React.ComponentProps<typeof YAxis>) {

  return (

    <YAxis

      {...props}

      axisLine={{ stroke: chartTheme.axisLine }}

      tick={{ fill: chartTheme.tick, fontSize: 10, fontWeight: 600 }}

      tickFormatter={(v) => formatPercent(Number(v) / 100, 0)}

      tickLine={{ stroke: chartTheme.axisLine }}

    />

  );

}



export function ChartTooltip({

  active,

  payload,

  label,

  valueFormatter,

}: {

  active?: boolean;

  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;

  label?: string;

  valueFormatter?: (value: number, name?: string) => string;

}) {

  if (!active || !payload?.length) return null;



  return (

    <div className="chart-tooltip chart-tooltip-animated">

      {label ? (

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">{label}</p>

      ) : null}

      {payload.map((entry) => {

        const raw = Number(entry.value ?? 0);

        const formatted = valueFormatter

          ? valueFormatter(raw, String(entry.name ?? entry.dataKey))

          : formatCrores(raw);

        return (

          <p key={String(entry.name)} className="mt-1 whitespace-nowrap text-sm font-semibold" style={{ color: entry.color }}>

            <span className="uppercase tracking-wide">{entry.name}</span>: {formatted}

          </p>

        );

      })}

    </div>

  );

}



export function RechartsPremiumTooltip({

  formatter,

}: {

  formatter?: (value: number, name?: string) => string;

}) {

  return (

    <Tooltip

      content={<ChartTooltip valueFormatter={formatter} />}

      cursor={{

        fill: "rgba(34, 211, 238, 0.08)",

        stroke: "rgba(34, 211, 238, 0.35)",

        strokeWidth: 1,

        strokeDasharray: "4 4",

      }}

    />

  );

}



export function ChartStage({

  children,

  height = "h-72",

  className,

}: {

  children: ReactNode;

  height?: string;

  className?: string;

}) {

  return (

    <motion.div

      animate={{ opacity: 1, scale: 1 }}

      className={`chart-shell relative ${height} ${className ?? ""}`}

      initial={{ opacity: 0, scale: 0.98 }}

      transition={{ duration: 0.45, ease: "easeOut" }}

    >

      <div className="chart-shell-inner">

        <div className="chart-shell-grid pointer-events-none absolute inset-0" />

        <div className="chart-shell-scanline" />

        <div className="chart-shell-corner chart-shell-corner-tl" />

        <div className="chart-shell-corner chart-shell-corner-br" />

        <div className="relative z-10 h-full w-full pl-1">{children}</div>

      </div>

    </motion.div>

  );

}


