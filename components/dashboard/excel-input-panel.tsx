"use client";

import type { ReactNode } from "react";

import { IsinSelect, ProductCodeSelect } from "@/components/ui/identity-selects";
import { ProductSelectField } from "@/components/ui/product-select-field";
import { DebentureSelect } from "@/components/ui/debenture-select";
import { ValuationDatePicker } from "@/components/ui/valuation-date-picker";
import { Button, FieldRow, FieldStack, Input, SubTitle } from "@/components/layout/app-ui";
import { useIndexAtDate } from "@/lib/hooks/use-index-at-date";
import {
  getPayoffSteps,
  getValuationInputFields,
  IDENTITY_HINT,
  INPUT_FIELD_HINTS,
  INPUT_HINT,
  VALUATION_DISCLAIMER,
} from "@/lib/dashboard-input-config";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { getDebenturePrice, getProductTradeDate, isSensexLinked, rawField, resolveLiveIndexLevel } from "@/lib/product-utils";
import { formatDeskDate } from "@/lib/market-data";
import type { ProductCategory, ProductRecord } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

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
  const { fetchIndexAtDate } = useIndexAtDate();
  const steps = !compact && mode === "payoff" ? getPayoffSteps() : null;
  const fields = mode === "valuation" ? getValuationInputFields() : null;

  return (
    <div className="space-y-3">
      {!compact ? (
        <p className="rounded-lg border border-gold/25 bg-gold/5 px-3 py-2 text-xs text-stone-700">
          {INPUT_HINT}
        </p>
      ) : null}

      {selection.marketLevels ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="market-live-badge">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · {selection.marketLevels.source === "yahoo" ? "Yahoo Finance" : "Desk fallback"}
          </span>
          <Button type="button" variant="ghost" onClick={() => void selection.refreshMarket()}>
            Refresh levels
          </Button>
        </div>
      ) : null}

      {mode === "valuation" && fields ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-gold-dark">{IDENTITY_HINT}</p>
          <FieldStack>
            {fields.map((field) => {
              if (field.type === "divider") {
                return (
                  <p key={field.key} className="py-1 text-center text-xs font-bold uppercase tracking-[0.3em] text-stone-500">
                    — {field.label} —
                  </p>
                );
              }
              if (field.key === "isin") {
                return (
                  <FieldRow key={field.key} hint={INPUT_FIELD_HINTS.isin} label={field.label}>
                    <IsinSelect
                      products={products}
                      value={selection.isin}
                      onChange={(isin, product) => {
                        selection.setField("isin", isin);
                        if (product) selection.selectProduct(product);
                        selection.setCategory(category);
                      }}
                    />
                  </FieldRow>
                );
              }
              if (field.key === "productCode") {
                return (
                  <FieldRow key={field.key} hint={INPUT_FIELD_HINTS.productCode} label={field.label}>
                    <ProductCodeSelect
                      products={products}
                      value={selection.productCode}
                      onChange={(code, product) => {
                        selection.setField("productCode", code);
                        if (product) selection.selectProduct(product);
                        selection.setCategory(category);
                      }}
                    />
                  </FieldRow>
                );
              }
              if (field.key === "productName") {
                return (
                  <FieldRow key={field.key} hint={INPUT_FIELD_HINTS.productName} label={field.label} wide>
                    <ProductSelectField
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
                  <FieldRow key={field.key} hint={INPUT_FIELD_HINTS.debentures} label={field.label}>
                    <DebentureSelect
                      product={selection.resolvedProduct}
                      value={selection.debentures}
                      onChange={(v) => selection.setField("debentures", v)}
                    />
                  </FieldRow>
                );
              }
              const stateKey = field.key as keyof typeof selection;
              if (!(stateKey in selection)) return null;
              const value = String(selection[stateKey] ?? "");
              if (field.key === "valuationDate") {
                return (
                  <FieldRow key={field.key} hint={INPUT_FIELD_HINTS[field.key]} label={field.label}>
                    <ValuationDatePicker
                      product={selection.resolvedProduct}
                      value={value}
                      onChange={async (next) => {
                        const product = selection.resolvedProduct;
                        selection.setField("valuationDate", next);
                        const tradeDesk = product ? formatDeskDate(getProductTradeDate(product) ?? new Date(0)) : undefined;
                        const levels = await fetchIndexAtDate(next, tradeDesk !== "Unknown" ? tradeDesk : undefined);
                        if (levels?.source === "mongodb" && levels.niftyLevel != null) {
                          selection.setField("niftyLevel", String(levels.niftyLevel));
                          selection.setField("sensexLevel", String(levels.sensexLevel ?? ""));
                        }
                      }}
                    />
                  </FieldRow>
                );
              }
              return (
                <FieldRow key={field.key} hint={INPUT_FIELD_HINTS[field.key]} label={field.label}>
                  <Input
                    className={cn(field.highlight && "input-glow", field.key === "valuationDate" && "font-semibold text-ink")}
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
        <div className="rounded-2xl border border-maroon/20 bg-maroon/5 p-4">
          <SubTitle>Steps</SubTitle>
          <ol className="mt-3 space-y-4">
            {steps.map((s) => (
              <li key={s.step}>
                <p className="text-sm font-semibold text-ink">
                  {s.step}) {s.title}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-stone-600">
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
  const product = selection.resolvedProduct;
  const priceHint = product ? String(getDebenturePrice(product)) : "";
  const liveLevel = product
    ? resolveLiveIndexLevel(product, {
        niftyLevel: Number(selection.niftyLevel) || undefined,
        sensexLevel: Number(selection.sensexLevel) || undefined,
      })
    : 0;
  const indexLabel = product && isSensexLinked(product) ? "Sensex" : "Nifty";

  return (
    <FieldStack>
      <FieldRow hint={INPUT_FIELD_HINTS.productName} label="Product Name" wide>
        <ProductSelectField
          products={products}
          value={selection.productName}
          onSelect={(p) => {
            selection.selectProduct(p);
            selection.setCategory(category);
          }}
        />
      </FieldRow>
      <FieldRow hint={INPUT_FIELD_HINTS.currentLevel} label={`Current Level (${indexLabel})`}>
        <Input
          readOnly
          className="input-glow font-semibold text-maroon"
          value={liveLevel > 0 ? formatNumber(liveLevel) : "Fetching from Yahoo…"}
        />
      </FieldRow>
      <p className="text-xs text-stone-500">
        Live {indexLabel} from Yahoo Finance · updates hourly with valuation inputs
      </p>
      <FieldRow hint={INPUT_FIELD_HINTS.purchaseDate} label="Purchase Date">
        <Input
          placeholder={product ? rawField(product, "Trade Date/Opening date", "Trade Date") ?? "Trade date" : "Trade date"}
          value={selection.purchaseDate}
          onChange={(e) => selection.setField("purchaseDate", e.target.value)}
        />
      </FieldRow>
      <FieldRow hint={INPUT_FIELD_HINTS.debentures} label="No. of Debentures">
        <DebentureSelect product={product} value={selection.debentures} onChange={(v) => selection.setField("debentures", v)} />
      </FieldRow>
      <FieldRow hint={INPUT_FIELD_HINTS.pricePerDebenture} label="Price / Debenture">
        <Input
          placeholder={priceHint || "Price per debenture"}
          value={selection.pricePerDebenture}
          onChange={(e) => selection.setField("pricePerDebenture", e.target.value)}
        />
      </FieldRow>
      {product ? (
        <p className="text-xs text-stone-500">
          Live index: Nifty {formatNumber(Number(selection.niftyLevel) || 0)} · Sensex {formatNumber(Number(selection.sensexLevel) || 0)}
        </p>
      ) : null}
    </FieldStack>
  );
}

export function DisclaimerBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rose-500/20 bg-transparent px-4 py-3 text-xs leading-6 text-rose-200/90",
        className,
      )}
    >
      <span className="font-bold uppercase tracking-wider text-rose-800">Disclaimer · </span>
      {children}
    </div>
  );
}
