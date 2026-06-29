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
  getDaysToMaturity,
  getProductLifecycleStatus,
} from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { ProductRecord } from "@/lib/types";
import { downloadLifecycleWorkbook, downloadProductsExcel } from "@/lib/workbook/export-products";
import { formatCrores, formatNumber } from "@/lib/utils";

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
  const { asOf, dayKey } = usePortfolioClock();
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
  }, [products, lifecycle, query, asOf, dayKey]);

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

      <div className={`mt-4 overflow-auto ${compact ? "max-h-[min(40vh,360px)]" : "max-h-[min(56vh,520px)]"}`}>
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
              <th>Notional</th>
              <th>Maturity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((p, index) => {
              const status = getProductLifecycleStatus(p, asOf);
              const days = getDaysToMaturity(p, asOf);
              return (
                <tr
                  key={p.rowId}
                  className={
                    onSelect
                      ? p.rowId === selectedId
                        ? "cursor-pointer bg-cyan-500/10"
                        : "cursor-pointer hover:bg-white/5"
                      : undefined
                  }
                  onClick={onSelect ? () => onSelect(p) : undefined}
                >
                  <td className="text-slate-500">{index + 1}</td>
                  <td>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                      {LIFECYCLE_STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td>{days != null ? formatNumber(days, 0) : "—"}</td>
                  <td className="max-w-[220px] truncate font-medium">{p.name}</td>
                  <td className="font-mono text-xs">{p.isin ?? "—"}</td>
                  <td>{p.issuer ?? "—"}</td>
                  <td>{p.underlying ?? "—"}</td>
                  <td>{formatCrores(p.tradeAmount ?? 0)}</td>
                  <td className="whitespace-nowrap text-xs">{p.maturityRaw ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>
      {filtered.length > 500 ? (
        <p className="mt-2 text-xs text-slate-500">Showing first 500 of {formatNumber(filtered.length)} — export for the full list.</p>
      ) : null}
    </Panel>
  );
}
