"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import { ProductCombobox } from "@/components/ui/product-combobox";
import { FieldRow, FieldStack, Input, Select, SubTitle } from "@/components/layout/app-ui";
import {
  DEBENTURE_PRESETS,
  getPayoffSteps,
  getValuationInputFields,
  IDENTITY_HINT,
  INPUT_HINT,
  VALUATION_DISCLAIMER,
} from "@/lib/dashboard-input-config";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { getEntryLevel } from "@/lib/product-utils";
import type { ProductCategory, ProductRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExcelInputPanel({
  category,
  products,
  mode,
  compact,
}: {
  category: ProductCategory;
  products: ProductRecord[];
  mode: "valuation" | "payoff";
  compact?: boolean;
}) {
  const selection = useProductSelection();
  const steps = !compact && mode === "payoff" ? getPayoffSteps() : null;
  const fields = mode === "valuation" ? getValuationInputFields() : null;

  return (
    <div className="space-y-3">
      {!compact ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-100">
          {INPUT_HINT}
        </p>
      ) : null}

      {mode === "valuation" && fields ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-cyan-300">{IDENTITY_HINT}</p>
          <FieldStack>
            {fields.map((field) => {
              if (field.type === "divider") {
                return (
                  <p key={field.key} className="py-1 text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                    — {field.label} —
                  </p>
                );
              }
              if (field.key === "productName") {
                return (
                  <FieldRow key={field.key} label={field.label} wide>
                    <ProductCombobox
                      products={products}
                      value={selection.productName}
                      onSelect={(p) => {
                        selection.selectProduct(p);
                        selection.setCategory(category);
                      }}
                    />
                  </FieldRow>
                );
              }
              if (field.key === "debentures") {
                return (
                  <FieldRow key={field.key} label={field.label}>
                    <DebentureSelect
                      value={selection.debentures}
                      onChange={(v) => selection.setField("debentures", v)}
                    />
                  </FieldRow>
                );
              }
              const isLevelField = field.key === "niftyLevel" || field.key === "sensexLevel";
              const stateKey = (isLevelField ? field.key : field.key) as keyof typeof selection;
              if (!(stateKey in selection)) {
                return null;
              }
              const value = String(selection[stateKey] ?? "");
              return (
                <FieldRow key={field.key} label={field.label}>
                  <Input
                    className={field.highlight ? "input-glow" : undefined}
                    type={field.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => selection.setField(stateKey as "isin", e.target.value)}
                  />
                </FieldRow>
              );
            })}
          </FieldStack>
          <DisclaimerBox className="mt-4">{VALUATION_DISCLAIMER}</DisclaimerBox>
        </div>
      ) : (
        <PayoffInputBlock category={category} products={products} />
      )}

      {steps ? (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <SubTitle>Steps</SubTitle>
          <ol className="mt-3 space-y-4">
            {steps.map((s) => (
              <li key={s.step}>
                <p className="text-sm font-semibold text-white">
                  {s.step}) {s.title}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function PayoffInputBlock({ category, products }: { category: ProductCategory; products: ProductRecord[] }) {
  const selection = useProductSelection();
  const entryHint = useMemo(
    () => (selection.resolvedProduct ? String(getEntryLevel(selection.resolvedProduct)) : "22800"),
    [selection.resolvedProduct],
  );

  return (
    <FieldStack>
      <FieldRow label="Product Name" wide>
        <ProductCombobox
          products={products}
          value={selection.productName}
          onSelect={(p) => {
            selection.selectProduct(p);
            selection.setCategory(category);
          }}
        />
      </FieldRow>
      <FieldRow label="Current Level">
        <Input
          placeholder={entryHint}
          value={selection.currentLevel}
          onChange={(e) => selection.setField("currentLevel", e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Purchase Date">
        <Input value={selection.purchaseDate} onChange={(e) => selection.setField("purchaseDate", e.target.value)} />
      </FieldRow>
      <FieldRow label="No. of Debentures">
        <DebentureSelect value={selection.debentures} onChange={(v) => selection.setField("debentures", v)} />
      </FieldRow>
      <FieldRow label="Price / Debenture">
        <Input
          value={selection.pricePerDebenture}
          onChange={(e) => selection.setField("pricePerDebenture", e.target.value)}
        />
      </FieldRow>
    </FieldStack>
  );
}

function DebentureSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = DEBENTURE_PRESETS.includes(value);
  return (
    <div className="flex gap-2">
      <Select
        className="flex-1"
        value={isPreset ? value : "__custom__"}
        onChange={(e) => {
          if (e.target.value !== "__custom__") onChange(e.target.value);
        }}
      >
        {DEBENTURE_PRESETS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </Select>
      {!isPreset ? (
        <Input className="w-28" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : null}
    </div>
  );
}

export function DisclaimerBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs leading-6 text-rose-200/90",
        className,
      )}
    >
      <span className="font-bold uppercase tracking-wider text-rose-300">Disclaimer · </span>
      {children}
    </div>
  );
}
