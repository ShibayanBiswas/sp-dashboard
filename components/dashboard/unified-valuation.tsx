"use client";

import { useMemo, useState } from "react";

import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { ProductNarrative } from "@/components/dashboard/product-narrative";
import { RevealOutput } from "@/components/ui/reveal-output";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { VirtualizedTableSection } from "@/components/ui/virtual-table-body";
import {
  AppPage,
  Button,
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
import { useMasterProducts } from "@/lib/hooks/use-master-products";
import {
  filterProductsByLifecycle,
  isValuationApplicable,
  isValuationApplicableAt,
  LIFECYCLE_FILTERS,
  type LifecycleFilter,
  LIFECYCLE_FILTER_LABELS,
} from "@/lib/product-lifecycle";
import { ProductOutputGuard } from "@/components/ui/product-output-guard";
import { formatOptionalNumber, handleOutputReveal } from "@/lib/product-data-guards";
import {
  getDebenturePrice,
  getIndexEntryLevel,
  getIndexEntryLevelRaw,
  getTargetLevel,
  isSensexLinked,
  rawField,
  resolveValuationLevel,
} from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { computeValuation } from "@/lib/workbook/valuation-engine";
import { downloadValuationScreenExcel } from "@/lib/workbook/export-screen";
import {
  formatCrores,
  formatCurrency,
  formatFormulaReturn,
  formatNumber,
  formatPercent,
  formatProductUnitValue,
  formatValuationAsOf,
} from "@/lib/utils";
const TABS = [
  { id: "interface", label: "Valuation Interface" },
  { id: "products", label: "Product List" },
];

export function UnifiedValuationDashboard() {
  const masterProducts = useMasterProducts();
  const selection = useProductSelection();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");
  const [tab, setTab] = useState("interface");

  const pool = useMemo(
    () => filterProductsByLifecycle(masterProducts, lifecycle),
    [masterProducts, lifecycle],
  );

  const product =
    selection.resolvedProduct && pool.some((p) => p.rowId === selection.resolvedProduct?.rowId)
      ? selection.resolvedProduct
      : pool[0];

  const valuation = useMemo(() => {
    if (!product || !isValuationApplicableAt(product, selection.valuationDate)) return null;
    const currentLevel = resolveValuationLevel(product, {
      niftyLevel: Number(selection.niftyLevel) || undefined,
      sensexLevel: Number(selection.sensexLevel) || undefined,
    });
    const inputs = {
      valuationDate: selection.valuationDate,
      currentLevel,
      debentures: Math.max(1, Math.round(Number(selection.debentures) || 100)),
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
              {LIFECYCLE_FILTERS.map((key) => (
                <Button key={key} active={lifecycle === key} variant="pill" onClick={() => setLifecycle(key)}>
                  {LIFECYCLE_FILTER_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-stone-500">
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
  const outputResetKey = useMemo(
    () =>
      [
        product?.rowId,
        selection.valuationDate,
        selection.niftyLevel,
        selection.sensexLevel,
        selection.debentures,
        selection.isin,
        selection.productCode,
      ].join("|"),
    [product?.rowId, selection.valuationDate, selection.niftyLevel, selection.sensexLevel, selection.debentures, selection.isin, selection.productCode],
  );

  return (
    <>
      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionInfo {...SECTION_INFO["val-inputs"]} />
          <SectionTitle>Inputs</SectionTitle>
          <p className="mt-1 text-sm italic text-amber-900/90">Enter any one identity field — white cells are inputs</p>
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
              <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-amber-900/90">
                {formatValuationAsOf(selection.valuationDate)}
              </p>
            </Panel>
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <RevealOutput
              footer={
                product ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      void downloadValuationScreenExcel({
                        product,
                        valuation,
                        inputs: {
                          valuationDate: selection.valuationDate,
                          niftyLevel: selection.niftyLevel,
                          sensexLevel: selection.sensexLevel,
                          debentures: selection.debentures,
                          isin: selection.isin,
                          productCode: selection.productCode,
                        },
                        outputSheet: [
                          ["Product Name", product.name],
                          ["Category", product.category],
                          ["ISIN", product.isin ?? "—"],
                          ["Issuer", product.issuer ?? "—"],
                          ["Underlying", product.underlying ?? "—"],
                          ["Entry / Initial Fixing", formatNumber(valuation?.indexEntryLevel ?? getIndexEntryLevel(product))],
                          [`Val. Date ${isSensexLinked(product) ? "Sensex" : "Nifty"} Level`, formatNumber(valuation?.currentLevel ?? 0)],
                          ["Target Level", String(getTargetLevel(product) ?? rawField(product, "Target Level", "Target Nifty ") ?? "—")],
                          ["Client Investment (face)", formatProductUnitValue(valuation?.clientInvestment ?? 0)],
                          ["Price / Debenture", formatProductUnitValue(getDebenturePrice(product))],
                          ["Index Performance (Z)", formatPercent(valuation?.z ?? 0, 1)],
                          ["Formula Return (S)", formatFormulaReturn(valuation?.formulaReturn ?? 0)],
                          ["Current Value", formatProductUnitValue(valuation?.productValue ?? 0)],
                          ["Notional", formatCrores(product.tradeAmount ?? 0)],
                        ],
                      })
                    }
                  >
                    Download screen to Excel
                  </Button>
                ) : null
              }
              label="Click here to view valuation output"
              resetKey={outputResetKey}
              onReveal={() => handleOutputReveal(product)}
            >
              {!isValuationApplicableAt(product, selection.valuationDate) ? (
                <Panel className="!p-5" glow="purple">
                  <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-amber-900">
                    Valuation not applicable for this date
                  </p>
                  <p className="mt-2 text-center text-sm text-stone-600">
                    Pick a valuation date between trade date and maturity. For expired products, use a historical date before redemption.
                  </p>
                </Panel>
              ) : (
                <ProductOutputGuard mode="valuation" product={product}>
                  {({ showValues }) =>
                    showValues ? (
                      <>
                <KpiBand
                  items={[
                    {
                      label: "Current Value",
                      value: formatProductUnitValue(valuation?.productValue ?? 0),
                    },
                    { label: "Abs. Return vs Deal Price", value: formatPercent(valuation?.absReturn ?? 0, 1) },
                    { label: "Product IRR", value: formatPercent(valuation?.productIrr ?? 0, 2) },
                    { label: "Total Amount", value: formatCurrency(valuation?.totalAmount ?? 0, false) },
                  ]}
                />

              <HorizontalBand className="mt-4">
                <ProductNarrative product={product} />
              </HorizontalBand>

              <HorizontalBand className="mt-4">
                <Panel className="!p-4" glow="cyan">
                  <SectionTitle>Output Sheet</SectionTitle>
                  <SectionInfo {...SECTION_INFO["val-output"]} />
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
                  <OutputGlow accent="purple">
                    {formatOptionalNumber(getIndexEntryLevelRaw(product) ?? valuation?.indexEntryLevel, formatNumber)}
                  </OutputGlow>
                </FieldRow>
                <FieldRow label={`Val. Date ${isSensexLinked(product) ? "Sensex" : "Nifty"} Level`}>
                  <OutputGlow accent="cyan">
                    {formatOptionalNumber(valuation?.currentLevel, formatNumber)}
                  </OutputGlow>
                </FieldRow>
                <FieldRow label="Target Level">
                  <Output>
                    {String(getTargetLevel(product) ?? rawField(product, "Target Level", "Target Nifty ") ?? "—")}
                  </Output>
                </FieldRow>
                <FieldRow label="Client Investment">
                  <OutputGlow accent="purple">{formatProductUnitValue(valuation?.clientInvestment ?? 0)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Price / Debenture">
                  <Output>{formatProductUnitValue(getDebenturePrice(product))}</Output>
                </FieldRow>
                <FieldRow label="Index Performance">
                  <OutputGlow accent="green">{formatPercent(valuation?.z ?? 0, 1)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Formula Return">
                  <OutputGlow accent="green">{formatFormulaReturn(valuation?.formulaReturn ?? 0)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Current Value">
                  <OutputGlow accent="cyan">{formatProductUnitValue(valuation?.productValue ?? 0)}</OutputGlow>
                </FieldRow>
                <FieldRow label="Notional">
                  <Output>{product.tradeAmount ? formatCrores(product.tradeAmount) : "—"}</Output>
                </FieldRow>
              </FieldStack>
                </Panel>
              </HorizontalBand>
                      </>
                    ) : null
                  }
                </ProductOutputGuard>
              )}
            </RevealOutput>
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
        <p className="mt-2 text-sm text-stone-500">{formatNumber(filtered.length)} products</p>
        <VirtualizedTableSection
          colSpan={8}
          rowCount={filtered.length}
          scrollClassName="mt-3 max-h-[min(64vh,640px)] overflow-auto rounded-2xl border border-stone-200"
          thead={
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
          }
        >
          {(index) => {
            const p = filtered[index]!;
            return (
              <tr
                key={p.rowId}
                className={p.rowId === selectedId ? "bg-gold/10" : "cursor-pointer hover:bg-stone-100"}
                onClick={() => selection.selectProduct(p)}
              >
                <td className="text-stone-500">{index + 1}</td>
                <td className="max-w-[240px] truncate font-medium">{p.name}</td>
                <td>{p.series ?? "—"}</td>
                <td className="font-mono text-xs">{p.isin ?? "—"}</td>
                <td>{p.issuer ?? "—"}</td>
                <td>{p.underlying ?? "—"}</td>
                <td>{formatCrores(p.tradeAmount ?? 0)}</td>
                <td>{p.maturityRaw ?? "—"}</td>
              </tr>
            );
          }}
        </VirtualizedTableSection>
      </Panel>
    </HorizontalBand>
  );
}

