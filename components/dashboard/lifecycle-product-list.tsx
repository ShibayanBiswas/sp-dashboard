"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import {
  Button,
  DataTable,
  Panel,
  SectionTitle,
} from "@/components/layout/app-ui";
import {
  filterProductsByLifecycle,
  LIFECYCLE_FILTER_LABELS,
  LIFECYCLE_STATUS_LABELS,
  LIFECYCLE_FILTERS,
  type LifecycleFilter,
  type LifecycleStatus,
  getDaysToMaturity,
  getProductLifecycleStatus,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { downloadLifecycleWorkbook, downloadProductsExcel } from "@/lib/workbook/export-products";
import { cn, formatCrores, formatNumber } from "@/lib/utils";

const STATUS_BADGE: Record<LifecycleStatus, string> = {
  ongoing: "status-badge status-badge-ongoing",
  perpetual: "status-badge status-badge-perpetual",
  "expiring-3m": "status-badge status-badge-expiring-3m",
  "expiring-1m": "status-badge status-badge-expiring-1m",
  expired: "status-badge status-badge-expired",
  upcoming: "status-badge status-badge-upcoming",
  unknown: "status-badge status-badge-unknown",
};

export function LifecycleProductList({
  products,
  selectedId,
  onSelect,
  defaultFilter = "ongoing",
  filter: controlledFilter,
  onFilterChange,
  showSearch = true,
  compact,
}: {
  products: ProductRecord[];
  selectedId?: string;
  onSelect?: (product: ProductRecord) => void;
  defaultFilter?: LifecycleFilter;
  filter?: LifecycleFilter;
  onFilterChange?: (filter: LifecycleFilter) => void;
  showSearch?: boolean;
  compact?: boolean;
}) {
  const { asOf } = usePortfolioClock();
  const [internalFilter, setInternalFilter] = useState<LifecycleFilter>(defaultFilter);
  const lifecycle = controlledFilter ?? internalFilter;
  const setLifecycle = onFilterChange ?? setInternalFilter;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const pool = filterProductsByLifecycle(products, lifecycle, asOf);
    if (!query.trim()) return pool;
    const needle = query.toLowerCase();
    return pool.filter((p) =>
      [p.name, p.isin, p.series, p.issuer, p.underlying].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [products, lifecycle, query, asOf]);

  const notional = filtered.reduce((sum, p) => sum + (p.tradeAmount ?? 0), 0);

  const handleDownload = () => {
    const label = LIFECYCLE_FILTER_LABELS[lifecycle].replace(/\s+/g, "-");
    downloadProductsExcel(filtered, `SP-${label}-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: LIFECYCLE_FILTER_LABELS[lifecycle].slice(0, 31),
    });
  };

  const handleDownloadAll = () => {
    downloadLifecycleWorkbook(products);
  };

  return (
    <Panel className={compact ? "!p-3" : "!p-4"} glow="cyan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionTitle>Portfolio by Lifecycle</SectionTitle>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(filtered.length)} products · {formatCrores(notional)} notional · as of {asOf.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Export view
          </Button>
          <Button variant="accent" onClick={handleDownloadAll}>
            <Download className="h-4 w-4" />
            Full workbook
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LIFECYCLE_FILTERS.map((key) => (
          <Button key={key} active={lifecycle === key} variant="pill" onClick={() => setLifecycle(key)}>
            {LIFECYCLE_FILTER_LABELS[key]}
          </Button>
        ))}
      </div>

      {showSearch ? (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="input-glow w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none"
            placeholder="Search name, ISIN, issuer, underlying…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      <div className={`mt-4 overflow-auto rounded-2xl border border-white/5 ${compact ? "max-h-[min(48vh,480px)]" : "max-h-[min(72vh,720px)]"}`}>
        <DataTable>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Days</th>
              <th>Name</th>
              <th>ISIN</th>
              <th>Issuer</th>
              <th>Underlying</th>
              <th className="text-right">Notional</th>
              <th>Maturity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="py-12 text-center text-slate-500" colSpan={9}>
                  No products match this lifecycle view{query.trim() ? " or search" : ""}.
                </td>
              </tr>
            ) : (
              filtered.map((p, index) => {
                const status = getProductLifecycleStatus(p, asOf);
                const days = getDaysToMaturity(p, asOf);
                const selected = p.rowId === selectedId;
                return (
                  <tr
                    key={p.rowId}
                    className={cn(
                      index % 2 === 1 && "data-table-row-alt",
                      onSelect && "cursor-pointer",
                      selected && "current-row",
                    )}
                    onClick={onSelect ? () => onSelect(p) : undefined}
                  >
                    <td className="font-mono text-xs text-slate-500">{index + 1}</td>
                    <td>
                      <span className={STATUS_BADGE[status]}>{LIFECYCLE_STATUS_LABELS[status]}</span>
                    </td>
                    <td className={cn("font-mono text-xs", days != null && days <= 30 && "text-amber-300")}>
                      {days != null ? formatNumber(days, 0) : "—"}
                    </td>
                    <td className="max-w-[240px] truncate font-medium text-white">{p.name}</td>
                    <td className="font-mono text-xs text-slate-400">{p.isin ?? "—"}</td>
                    <td className="text-slate-300">{p.issuer ?? "—"}</td>
                    <td className="text-slate-300">{p.underlying ?? "—"}</td>
                    <td className="text-right font-semibold tabular-nums text-cyan-100">{formatCrores(p.tradeAmount ?? 0)}</td>
                    <td className="whitespace-nowrap text-xs text-slate-400">{p.maturityRaw ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </div>
    </Panel>
  );
}
