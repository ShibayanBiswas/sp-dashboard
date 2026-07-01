"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";

import { Button, DataTable, Select, SubTitle } from "@/components/layout/app-ui";
import { runPivotEngine, type PivotAgg, type PivotResponse } from "@/lib/pivot/engine";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export type PivotFieldDef = {
  key: string;
  label: string;
  type?: "number" | "text";
};

type PivotTableProps = {
  title?: string;
  data: Record<string, unknown>[];
  fields: PivotFieldDef[];
  defaultRows?: string[];
  defaultColumns?: string[];
  defaultValues?: string[];
  defaultAgg?: PivotAgg;
  valueFormatter?: (value: number, field: string) => string;
  className?: string;
};

export function PivotTable({
  title = "Pivot Explorer",
  data,
  fields,
  defaultRows = [],
  defaultColumns = [],
  defaultValues,
  defaultAgg = "sum",
  valueFormatter,
  className,
}: PivotTableProps) {
  const numericFields = useMemo(() => fields.filter((f) => f.type === "number").map((f) => f.key), [fields]);
  const [rows, setRows] = useState<string[]>(defaultRows);
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [values, setValues] = useState<string[]>(defaultValues ?? (numericFields[0] ? [numericFields[0]] : ["value"]));
  const [agg, setAgg] = useState<PivotAgg>(defaultAgg);
  const [result, setResult] = useState<PivotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"pivot" | "flat">("pivot");

  const formatCell = useCallback(
    (value: number, field: string) => {
      if (valueFormatter) return valueFormatter(value, field);
      if (field.toLowerCase().includes("notional") || field.toLowerCase().includes("amount") || field === "tradeAmount") {
        return formatCurrency(value);
      }
      return formatNumber(value);
    },
    [valueFormatter],
  );

  const compute = useCallback(async () => {
    if (!data.length || !values.length) {
      setResult(null);
      return;
    }
    setLoading(true);
    const payload = { data, rows, columns, values, agg };
    try {
      const res = await fetch("/api/pivot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setResult((await res.json()) as PivotResponse);
      } else {
        setResult(runPivotEngine(payload));
      }
    } catch {
      setResult(runPivotEngine(payload));
    } finally {
      setLoading(false);
    }
  }, [agg, columns, data, rows, values]);

  useEffect(() => {
    void compute();
  }, [compute]);

  const fieldLabel = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-gold-dark" />
          <SubTitle>{title}</SubTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className={cn(mode === "flat" && "border-gold/40 text-gold-dark")} onClick={() => setMode("flat")}>
            Flat Table
          </Button>
          <Button
            className={cn(mode === "pivot" && "border-maroon/30 text-maroon")}
            onClick={() => setMode("pivot")}
          >
            Pivot View
          </Button>
          <Button onClick={() => void compute()}>
            <RefreshCw className={cn("mr-1 inline h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {mode === "pivot" ? (
        <>
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-100 p-4 lg:grid-cols-4">
            <PivotZone label="Rows" options={fields} selected={rows} onChange={setRows} />
            <PivotZone label="Columns" options={fields} selected={columns} onChange={setColumns} />
            <PivotZone
              label="Values"
              options={fields.filter((f) => f.type === "number")}
              selected={values}
              onChange={setValues}
              single
            />
            <div>
              <p className="label-chip mb-2">Aggregation</p>
              <Select value={agg} onChange={(e) => setAgg(e.target.value as PivotAgg)}>
                <option value="sum">Sum</option>
                <option value="count">Count</option>
                <option value="avg">Average</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </Select>
              {result ? (
                <p className="mt-2 text-[10px] text-stone-500">Engine: {result.engine}</p>
              ) : null}
            </div>
          </div>

          {result && result.rowKeys.length > 0 ? (
            <DataTable>
              <thead>
                <tr>
                  <th>{rows.map(fieldLabel).join(" / ") || "Row"}</th>
                  {result.colKeys.map((ck) => (
                    <th key={ck}>{ck.split("§").join(" · ")}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rowKeys.map((rk, ri) => (
                  <tr key={rk}>
                    <td className="font-medium">{rk.split("§").join(" · ")}</td>
                    {result.matrix[ri]?.map((cell, ci) => (
                      <td key={ci}>{formatCell(Number(cell), values[0])}</td>
                    ))}
                    <td className="font-semibold text-gold-dark">
                      {formatCell(Number(result.rowTotals[ri] ?? 0), values[0])}
                    </td>
                  </tr>
                ))}
                <tr className="bg-white/5">
                  <td className="font-bold">Total</td>
                  {result.colTotals.map((t, i) => (
                    <td key={i} className="font-semibold">
                      {formatCell(Number(t), values[0])}
                    </td>
                  ))}
                  <td className="font-bold text-maroon">{formatCell(Number(result.grandTotal), values[0])}</td>
                </tr>
              </tbody>
            </DataTable>
          ) : (
            <p className="text-sm text-stone-500">Add row/column fields to build a pivot.</p>
          )}
        </>
      ) : (
        <DataTable>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 200).map((row, i) => (
              <tr key={i}>
                {fields.map((f) => (
                  <td key={f.key}>{String(row[f.key] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}

function PivotZone({
  label,
  options,
  selected,
  onChange,
  single,
}: {
  label: string;
  options: PivotFieldDef[];
  selected: string[];
  onChange: (v: string[]) => void;
  single?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gold/30 bg-gold/5 p-3">
      <p className="label-chip mb-2">{label}</p>
      <Select
        value={single ? (selected[0] ?? "") : ""}
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return;
          if (single) {
            onChange([key]);
            return;
          }
          if (!selected.includes(key)) onChange([...selected, key]);
        }}
      >
        <option value="">+ Add field</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </Select>
      <div className="mt-2 flex flex-wrap gap-1">
        {selected.map((key) => (
          <button
            key={key}
            className="rounded-full border border-stone-200 bg-white/10 px-2 py-0.5 text-[10px] text-stone-700 hover:border-rose-500/40"
            type="button"
            onClick={() => onChange(selected.filter((k) => k !== key))}
          >
            {options.find((o) => o.key === key)?.label ?? key} ×
          </button>
        ))}
      </div>
    </div>
  );
}
