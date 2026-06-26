"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Command, X } from "lucide-react";

import { commandRoutes } from "@/lib/navigation";
import { useDataset } from "@/lib/context/dataset-provider";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { cn } from "@/lib/utils";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { dataset } = useDataset();
  const selection = useProductSelection();

  const routeResults = useMemo(() => {
    if (!query.trim()) return commandRoutes.slice(0, 12);
    const needle = query.toLowerCase();
    return commandRoutes.filter((r) => r.label.toLowerCase().includes(needle) || r.group.toLowerCase().includes(needle));
  }, [query]);

  const productResults = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.toLowerCase();
    return dataset.products
      .filter((p) =>
        [p.name, p.isin, p.issuer, p.series].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [dataset.products, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm">
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="dropdown-panel w-full max-w-xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Command className="h-4 w-4 text-cyan-400" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Jump to page or search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="text-slate-500 hover:text-white" type="button" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {routeResults.length > 0 ? (
            <div className="mb-3">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigate</p>
              {routeResults.map((route) => (
                <button
                  key={route.href}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-white"
                  type="button"
                  onClick={() => {
                    router.push(route.href as Route);
                    onOpenChange(false);
                    setQuery("");
                  }}
                >
                  <span>
                    <span className="text-slate-500">{route.group} · </span>
                    {route.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                </button>
              ))}
            </div>
          ) : null}

          {productResults.length > 0 ? (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Products</p>
              {productResults.map((p) => (
                <button
                  key={p.rowId}
                  className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-purple-500/10"
                  type="button"
                  onClick={() => {
                    selection.selectProduct(p);
                    router.push("/valuation" as Route);
                    onOpenChange(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium text-white">{p.name}</span>
                  <span className="text-xs text-slate-500">
                    {p.category} · {p.isin ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {!routeResults.length && !productResults.length ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">No matches.</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
