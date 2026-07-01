"use client";

import { motion } from "framer-motion";

import { categoryNeon } from "@/lib/chart-theme";
import type { DashboardDataset } from "@/lib/types";
import { computeCategoryRisks, type CategoryRisk } from "@/lib/risk-model";

type GaugeRow = {
  category: string;
  riskScore: number;
  listed: number;
  protected: number;
  credible: number;
  avgTenorYears: number;
  components: CategoryRisk["components"];
};

export function buildCategoryRiskGauges(dataset: DashboardDataset): GaugeRow[] {
  return computeCategoryRisks(dataset.products).map((risk) => ({
    category: risk.category,
    riskScore: risk.score,
    listed: risk.listedShare * 100,
    protected: risk.protectedShare * 100,
    credible: risk.credibleShare * 100,
    avgTenorYears: risk.avgTenorYears,
    components: risk.components,
  }));
}

function bandColors(score: number) {
  if (score <= 35) return { label: "LOW", color: "#15803d" };
  if (score <= 65) return { label: "MODERATE", color: "#b45309" };
  return { label: "ELEVATED", color: "#be123c" };
}

function SpeedometerGauge({ row, index }: { row: GaugeRow; index: number }) {
  const accent = categoryNeon[row.category] ?? "#d4b24c";
  const band = bandColors(row.riskScore);
  const needleAngle = -90 + (row.riskScore / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleX = 100 + Math.cos(needleRad) * 58;
  const needleY = 100 + Math.sin(needleRad) * 58;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="speedometer-card"
      initial={{ opacity: 0, y: 12 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
    >
      <p className="speedometer-label">{row.category.toUpperCase()}</p>
      <svg className="mx-auto block" height="130" viewBox="0 0 200 120" width="200">
        <defs>
          <linearGradient id={`gauge-${row.category}`} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <filter id={`glow-${row.category}`}>
            <feGaussianBlur result="blur" stdDeviation="2" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeLinecap="round"
          strokeWidth="14"
        />
        {/* Colored arc */}
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke={`url(#gauge-${row.category})`}
          strokeLinecap="round"
          strokeWidth="10"
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const a = (-90 + (tick / 100) * 180) * (Math.PI / 180);
          const x1 = 100 + Math.cos(a) * 62;
          const y1 = 100 + Math.sin(a) * 62;
          const x2 = 100 + Math.cos(a) * 72;
          const y2 = 100 + Math.sin(a) * 72;
          return (
            <line
              key={tick}
              stroke="rgba(148,163,184,0.35)"
              strokeWidth={tick % 50 === 0 ? 2 : 1}
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          );
        })}

        {/* Needle */}
        <motion.line
          animate={{ opacity: 1 }}
          filter={`url(#glow-${row.category})`}
          initial={{ opacity: 0 }}
          stroke={band.color}
          strokeLinecap="round"
          strokeWidth="3"
          transition={{ delay: 0.2 + index * 0.08 }}
          x1="100"
          x2={needleX}
          y1="100"
          y2={needleY}
        />
        <circle cx="100" cy="100" fill={accent} r="7" stroke="#78716c" strokeWidth="2" />
        <circle cx="100" cy="100" fill="#fff" opacity="0.9" r="3" />

        <text fill="#57534e" fontSize="9" fontWeight="700" textAnchor="middle" x="34" y="112">
          0
        </text>
        <text fill="#57534e" fontSize="9" fontWeight="700" textAnchor="middle" x="166" y="112">
          100
        </text>
      </svg>

      <div className="mt-1 text-center">
        <motion.p
          animate={{ scale: 1 }}
          className="text-3xl font-black tabular-nums"
          initial={{ scale: 0.9 }}
          style={{ color: band.color }}
          transition={{ delay: 0.3 + index * 0.08 }}
        >
          {row.riskScore}
        </motion.p>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: band.color }}>
          {band.label} RISK
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px] uppercase tracking-wide text-stone-500">
        <div className="rounded-lg border border-stone-200 bg-stone-100 px-2 py-1.5">
          <span className="block font-bold text-emerald-800">{row.credible.toFixed(0)}%</span>
          Credible Issuer
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-100 px-2 py-1.5">
          <span className="block font-bold text-gold-dark">{row.listed.toFixed(0)}%</span>
          Listed
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-100 px-2 py-1.5">
          <span className="block font-bold text-maroon">{row.avgTenorYears.toFixed(1)}y</span>
          Avg Tenor
        </div>
      </div>
      <p className="mt-2 text-center text-[9px] leading-relaxed text-stone-500">
        Score reflects issuer quality, capital protection, time to maturity, and market linkage.
      </p>
    </motion.div>
  );
}

export function CategoryRiskSpeedometerPanel({ dataset }: { dataset: DashboardDataset }) {
  const gauges = buildCategoryRiskGauges(dataset);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {gauges.map((row, index) => (
        <SpeedometerGauge key={row.category} index={index} row={row} />
      ))}
    </div>
  );
}
