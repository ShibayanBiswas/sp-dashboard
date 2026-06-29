"use client";

import { useMemo } from "react";
import { Activity, TrendingDown, TrendingUp, Zap } from "lucide-react";

import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { useDataset } from "@/lib/context/dataset-provider";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export function MarketStrip() {
  const { dataset, uploadState } = useDataset();
  const { asOf } = usePortfolioClock();
  const stats = useMemo(() => getPortfolioHeadlineStats(dataset, asOf), [dataset, asOf]);

  const items = [
    { icon: Zap, label: "Live", value: formatCurrency(stats.liveNotional), color: "text-cyan-400" },
    { icon: TrendingUp, label: "Active", value: formatNumber(stats.activeCount), color: "text-emerald-400" },
    { icon: TrendingDown, label: "Expired", value: formatNumber(stats.expiredCount), color: "text-slate-400" },
    { icon: Activity, label: "3M", value: formatNumber(stats.maturingSoon), color: "text-orange-400" },
    { icon: Activity, label: "1M", value: formatNumber(stats.expiring1m), color: "text-rose-400" },
  ];

  return (
    <div className="overflow-hidden border-b border-white/5 bg-black/30">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-1.5">
        <div className="flex flex-wrap items-center gap-4">
          {items.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px]">
              <item.icon className={cn("h-3 w-3", item.color)} />
              <span className="text-slate-500">{item.label}</span>
              <span className={cn("font-semibold", item.color)}>{item.value}</span>
            </span>
          ))}
        </div>
        <p className="truncate text-[10px] text-slate-600">{uploadState}</p>
      </div>
    </div>
  );
}
