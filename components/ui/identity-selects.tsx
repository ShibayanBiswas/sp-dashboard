"use client";

import { useMemo } from "react";

import { Select } from "@/components/layout/app-ui";
import type { ProductRecord } from "@/lib/types";

function uniqueSorted(values: Array<string | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

export function IsinSelect({
  products,
  value,
  onChange,
}: {
  products: ProductRecord[];
  value: string;
  onChange: (isin: string, product?: ProductRecord) => void;
}) {
  const options = useMemo(() => uniqueSorted(products.map((p) => p.isin)), [products]);
  const byIsin = useMemo(() => new Map(products.filter((p) => p.isin).map((p) => [p.isin!, p])), [products]);

  return (
    <Select
      className="select-dark"
      value={value || ""}
      onChange={(e) => {
        const isin = e.target.value;
        onChange(isin, byIsin.get(isin));
      }}
    >
      <option value="">Select ISIN…</option>
      {options.map((isin) => (
        <option key={isin} value={isin}>
          {isin}
        </option>
      ))}
    </Select>
  );
}

export function ProductCodeSelect({
  products,
  value,
  onChange,
}: {
  products: ProductRecord[];
  value: string;
  onChange: (code: string, product?: ProductRecord) => void;
}) {
  const options = useMemo(
    () => uniqueSorted(products.map((p) => p.series ?? String(p.raw["Product Code"] ?? ""))),
    [products],
  );
  const byCode = useMemo(() => {
    const map = new Map<string, ProductRecord>();
    for (const p of products) {
      const code = p.series ?? String(p.raw["Product Code"] ?? "");
      if (code) map.set(code, p);
    }
    return map;
  }, [products]);

  return (
    <Select
      className="select-dark"
      value={value || ""}
      onChange={(e) => {
        const code = e.target.value;
        onChange(code, byCode.get(code));
      }}
    >
      <option value="">Select product code…</option>
      {options.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </Select>
  );
}
