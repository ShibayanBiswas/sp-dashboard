"use client";

import { useMemo } from "react";
import { Activity, Database, Server } from "lucide-react";

import { useMasterProducts } from "@/lib/hooks/use-master-products";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import { useDataset } from "@/lib/context/dataset-provider";
import { formatNumber } from "@/lib/utils";

export function DeskFooter() {
  const { uploadState, isLoading } = useDataset();
  const masterProducts = useMasterProducts();
  const { asOf } = usePortfolioClock();

  const nodeLabel = useMemo(() => {
    if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
      return `Next.js · ${process.env.NODE_ENV ?? "development"}`;
    }
    return "Next.js · browser";
  }, []);

  return (
    <footer className="relative z-10 mt-8 border-t border-white/10 bg-slate-950/60 font-ui backdrop-blur-xl">
      <div className="mx-auto flex max-w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-[11px] text-slate-500 lg:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-cyan-400" />
            {nodeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-purple-400" />
            {formatNumber(masterProducts.length)} valid Primary products
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            Desk clock {asOf.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="max-w-xl truncate text-right italic">{isLoading ? "Loading master…" : uploadState}</p>
      </div>
    </footer>
  );
}
