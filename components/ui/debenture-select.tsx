"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/layout/app-ui";
import { DEBENTURE_PRESETS } from "@/lib/dashboard-input-config";
import type { ProductRecord } from "@/lib/types";
import { getMaxDebentures } from "@/lib/product-utils";
import { cn } from "@/lib/utils";

export function DebentureSelect({
  value,
  onChange,
  product,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  product?: ProductRecord;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(value);
  const maxDebentures = product ? getMaxDebentures(product) : 1_000_000;

  useEffect(() => {
    setDraft(value);
  }, [value, product?.rowId]);

  const validate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return "Enter a whole number of debentures.";
    }
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return "Natural numbers only — no zero, decimals, or letters.";
    }
    const n = Number(trimmed);
    if (product && n > maxDebentures) {
      return `Cannot exceed ${maxDebentures.toLocaleString("en-IN")} debentures (master notional ÷ price per debenture).`;
    }
    return null;
  };

  const apply = (raw: string) => {
    const message = validate(raw);
    if (message) {
      setError(message);
      window.alert(message);
      setDraft(value);
      return;
    }
    setError(null);
    const normalized = String(Number(raw.trim()));
    setDraft(normalized);
    onChange(normalized);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoComplete="off"
          className="input-glow min-w-[10rem] flex-1 font-semibold text-ink"
          inputMode="numeric"
          placeholder="Type debenture count"
          type="text"
          value={draft}
          onBlur={() => apply(draft)}
          onChange={(e) => {
            setError(null);
            setDraft(e.target.value.replace(/[^\d]/g, ""));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply(draft);
            }
          }}
        />
        <span className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700">
          Max{" "}
          <span className="font-bold text-maroon">{maxDebentures.toLocaleString("en-IN")}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEBENTURE_PRESETS.filter((n) => Number(n) <= maxDebentures).map((n) => (
          <button
            key={n}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
              draft === n
                ? "border-gold bg-gold/15 text-ink"
                : "border-stone-200 bg-white text-stone-600 hover:border-gold/40",
            )}
            type="button"
            onClick={() => {
              setError(null);
              setDraft(n);
              onChange(n);
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
