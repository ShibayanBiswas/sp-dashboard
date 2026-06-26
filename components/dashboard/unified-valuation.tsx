"use client";

import { useMemo, useState } from "react";

import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { ProductNarrative } from "@/components/dashboard/product-narrative";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import {
  AppPage,
  Button,
  DataTable,
  FieldRow,
  FieldStack,
  KpiBand,
  Output,
  OutputGlow,
  Panel,
  SectionInfo,
  SectionTitle,
  SubPageTabs,
  SubTitle,
} from "@/components/layout/app-ui";
import { SECTION_INFO } from "@/lib/section-info";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { useDataset } from "@/lib/context/dataset-provider";
import {
  filterProductsByLifecycle,
  type LifecycleFilter,
  LIFECYCLE_FILTER_LABELS,
} from "@/lib/product-lifecycle";
import { getDebenturePrice, getIndexEntryLevel, getTargetLevel, isSensexLinked, rawField, resolveValuationLevel } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { computeValuation } from "@/lib/workbook/valuation-engine";
import {
  formatCrores,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatProductUnitValue,
  formatValuationAsOf,
} from "@/lib/utils";
import { MathZ } from "@/components/ui/math-text";

const TABS = [
  { id: "interface", label: "Valuation Interface" },
  { id: "products", label: "Product List" },
];

export function UnifiedValuationDashboard() {
  const { dataset } = useDataset();
  const selection = useProductSelection();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");
  const [tab, setTab] = useState("interface");

  const pool = useMemo(
    () => filterProductsByLifecycle(dataset.products, lifecycle),
    [dataset.products, lifecycle],
  );

  const product =
    selection.resolvedProduct && pool.some((p) => p.rowId === selection.resolvedProduct?.rowId)
      ? selection.resolvedProduct
      : pool[0];

  const valuation = useMemo(() => {
    if (!product) return null;
    const currentLevel = resolveValuationLevel(product, {
      niftyLevel: Number(selection.niftyLevel) || undefined,
      sensexLevel: Number(selection.sensexLevel) || undefined,
    });
    const inputs = {
      valuationDate: selection.valuationDate,
      currentLevel,
      debentures: Number(selection.debentures) || 100,
      purchasePrice: Number(selection.pricePerDebenture) || (product ? getDebenturePrice(product) : undefined),
    };
    return computeValuation(product, inputs);
  }, [product, selection]);

  return (
    <AppPage dense title="Valuation">
      <HorizontalBand>
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["val-filter"]} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubTitle>Primary Valuation · Portfolio Filter</SubTitle>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIFECYCLE_FILTER_LABELS) as LifecycleFilter[]).map((key) => (
                <Button key={key} active={lifecycle === key} variant="pill" onClick={() => setLifecycle(key)}>
                  {LIFECYCLE_FILTER_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {formatNumber(pool.length)} products in {LIFECYCLE_FILTER_LABELS[lifecycle].toLowerCase()} book
          </p>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <SubPageTabs active={tab} onSelect={setTab} tabs={TABS} />
      </HorizontalBand>

      {tab === "interface" ? (
        <ValuationInterface pool={pool} product={product} selection={selection} valuation={valuation} />
      ) : null}
      {tab === "products" ? <ProductListTab products={pool} selectedId={product?.rowId} /> : null}
    </AppPage>
  );
}

function ValuationInterface({
  pool,
  product,
  selection,
  valuation,
}: {
  pool: ProductRecord[];
  product?: ProductRecord;
  selection: ReturnType<typeof useProductSelection>;
  valuation: ReturnType<typeof computeValuation> | null;
}) {
  return (
    <>
      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionInfo {...SECTION_INFO["val-inputs"]} />
          <SectionTitle>Inputs</SectionTitle>
          <p className="mt-1 text-sm italic text-amber-200/90">Enter any one identity field — white cells are inputs</p>
          <div className="mt-4">
            <ExcelInputPanel
              category={product?.category ?? "Primary"}
              compact
              mode="valuation"
              products={pool}
            />
          </div>
        </Panel>
      </HorizontalBand>

      {product ? (
        <>
          <HorizontalBand className="mt-4">
            <Panel className="!p-3" glow="cyan">
              <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-amber-200/90">
                {formatValuationAsOf(selection.valuationDate)}
              </p>
            </Panel>
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <KpiBand
              items={[
                {
                  label: "Product Value",
                  value: formatProductUnitValue(valuation?.productValue ?? 0),
                },
                { label: "Abs. Return", value: formatPercent(valuation?.absReturn ?? 0, 1) },
                { label: "Product IRR", value: formatPercent(valuation?.productIrr ?? 0, 2) },
                { label: "Total Amount", value: formatCurrency(valuation?.totalAmount ?? 0, false) },
              ]}
            />
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <ProductNarrative product={product} />
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <Panel className="!p-4" glow="cyan">
              <SectionInfo {...SECTION_INFO["val-output"]} />
              <SectionTitle>Output Sheet</SectionTitle>
              <FieldStack>
                <FieldRow label="Product Name">
                  <Output>{product.name}</Output>
                </FieldRow>
                <FieldRow label="Category">
                  <OutputGlow accent="cyan">{product.category}</OutputGlow>
                </FieldRow>
                <FieldRow label="ISIN">
                  <Output className="font-mono text-sm">{product.isin ?? "—"}</Output>
                </FieldRow>
                <FieldRow label="Issuer">
                  <Output>{product.issuer ?? "—"}</Output>
                </FieldRow>
                <FieldRow label="Underlying">
                  <Output>{product.underlying ?? "—"}</Output>
                </FieldRow>
                <FieldRow label="Entry / Initial Fixing">
                  <OutputGlow accent="purple">{formatNumber(valuation?.indexEntryLevel ?? getIndexEntryLevel(product))}</OutputGlow>
                </FieldRow>
                <FieldRow label={`Val. Date ${isSensexLinked(product) ? "Sensex" : "Nifty"} Level`}>
                  <OutputGlow accent="cyan">{formatNumber(valuation?.currentLevel ?? 0)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Target Level">
                  <Output>
                    {String(getTargetLevel(product) ?? rawField(product, "Target Level", "Target Nifty ") ?? "—")}
                  </Output>
                </FieldRow>
                <FieldRow
                  label={
                    <>
                      <MathZ /> Performance
                    </>
                  }
                >
                  <OutputGlow accent="green">{formatPercent(valuation?.z ?? 0)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Notional">
                  <OutputGlow accent="cyan">{formatCrores(product.tradeAmount ?? 0)}</OutputGlow>
                </FieldRow>
              </FieldStack>
            </Panel>
          </HorizontalBand>
        </>
      ) : (
        <HorizontalBand className="mt-4">
          <Panel>
            <Output>No products in this lifecycle bucket.</Output>
          </Panel>
        </HorizontalBand>
      )}
    </>
  );
}

function ProductListTab({ products, selectedId }: { products: ProductRecord[]; selectedId?: string }) {
  const selection = useProductSelection();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const needle = query.toLowerCase();
    return products.filter((p) =>
      [p.name, p.isin, p.series, p.issuer].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [products, query]);

  return (
    <HorizontalBand className="mt-4">
      <Panel className="!p-4" glow="cyan">
        <SectionInfo {...SECTION_INFO["val-products"]} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Product List</SectionTitle>
          <input
            className="input-glow w-full max-w-sm rounded-xl px-4 py-2 text-sm outline-none"
            placeholder="Filter by name, ISIN, series, issuer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">{formatNumber(filtered.length)} products</p>
        <div className="mt-3 max-h-[min(64vh,640px)] overflow-auto">
          <DataTable>
            <thead>
              <tr>
                <th>#</th>
                <th>Name on Signup Form</th>
                <th>Series</th>
                <th>ISIN No.</th>
                <th>Issuer</th>
                <th>Underlying</th>
                <th>Notional</th>
                <th>Maturity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((p, index) => (
                <tr
                  key={p.rowId}
                  className={p.rowId === selectedId ? "bg-cyan-500/10" : "cursor-pointer hover:bg-white/5"}
                  onClick={() => selection.selectProduct(p)}
                >
                  <td className="text-slate-500">{index + 1}</td>
                  <td className="max-w-[240px] truncate font-medium">{p.name}</td>
                  <td>{p.series ?? "—"}</td>
                  <td className="font-mono text-xs">{p.isin ?? "—"}</td>
                  <td>{p.issuer ?? "—"}</td>
                  <td>{p.underlying ?? "—"}</td>
                  <td>{formatCrores(p.tradeAmount ?? 0)}</td>
                  <td>{p.maturityRaw ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </Panel>
    </HorizontalBand>
  );
}

