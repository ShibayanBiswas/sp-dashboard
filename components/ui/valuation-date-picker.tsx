"use client";

import { useMemo } from "react";

import { Input } from "@/components/layout/app-ui";
import { deskDateInputValue, parseDeskDateInput } from "@/lib/product-data-guards";
import { formatDeskDate } from "@/lib/market-data";
import type { ProductRecord } from "@/lib/types";
import { getProductTradeDate } from "@/lib/product-utils";
import { cn } from "@/lib/utils";

export function ValuationDatePicker({
  product,
  value,
  onChange,
  className,
}: {
  product?: ProductRecord;
  value: string;
  onChange: (deskDate: string) => void;
  className?: string;
}) {
  const tradeDate = product ? getProductTradeDate(product) : undefined;
  const min = tradeDate ? deskDateInputValue(tradeDate) : undefined;
  const max = deskDateInputValue(new Date());

  const inputValue = useMemo(() => {
    const parsed = parseDeskDateInput(value);
    return parsed ? deskDateInputValue(parsed) : "";
  }, [value]);

  return (
    <div className={cn("space-y-1", className)}>
      <Input
        className="input-glow font-semibold text-ink"
        max={max}
        min={min}
        type="date"
        value={inputValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) return;
          const picked = parseDeskDateInput(raw);
          if (!picked) return;
          if (tradeDate && picked.getTime() < tradeDate.getTime()) {
            window.alert(`Valuation date must be on or after the product launch date (${formatDeskDate(tradeDate)}).`);
            return;
          }
          if (picked.getTime() > Date.now()) {
            window.alert("Valuation date cannot be after today.");
            return;
          }
          onChange(formatDeskDate(picked));
        }}
      />
      {tradeDate ? (
        <p className="text-[10px] text-stone-500">
          Launch {formatDeskDate(tradeDate)} → today · calendar dates only
        </p>
      ) : null}
    </div>
  );
}
