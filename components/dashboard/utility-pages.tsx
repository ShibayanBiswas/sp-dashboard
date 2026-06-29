"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, Upload as UploadIcon } from "lucide-react";

import { PayoffCurvePanel } from "@/components/dashboard/payoff-curve";
import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { LifecycleProductList } from "@/components/dashboard/lifecycle-product-list";
import { ProductNarrative } from "@/components/dashboard/product-narrative";
import { ProductCombobox } from "@/components/ui/product-combobox";
import { PivotTable } from "@/components/ui/pivot-table";
import {
  AppPage,
  Button,
  DataTable,
  FieldRow,
  KpiBand,
  Output,
  OutputGlow,
  Panel,
  SectionTitle,
  SubTitle,
} from "@/components/layout/app-ui";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
import {
  filterProductsByLifecycle,
  getProductLifecycleStatus,
  isValuationApplicable,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { categoryNeon } from "@/lib/chart-theme";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { useDataset } from "@/lib/context/dataset-provider";
import { getDebenturePrice, getIndexEntryLevel, getTargetLevel, rawField, resolveLiveIndexLevel, resolveValuationLevel } from "@/lib/product-utils";
import { buildPayoffScenarioTable, getPayoffTenorDays } from "@/lib/workbook/payoff-scenarios";
import { buildEnhancedPayoffScenarioTable } from "@/lib/workbook/payoff-pivots";
import { downloadProductsExcel } from "@/lib/workbook/export-products";
import { computeValuation } from "@/lib/workbook/valuation-engine";
import { cn, formatCrores, formatCurrency, formatFormulaReturn, formatNumber, formatPercent, formatProductUnitValue } from "@/lib/utils";
import { RevealOutput } from "@/components/ui/reveal-output";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import { useMasterProducts } from "@/lib/hooks/use-master-products";

export function ProductSearchPage() {
  const masterProducts = useMasterProducts();
  const selection = useProductSelection();

  const results = useMemo(() => {
    if (!selection.productName) return masterProducts;
    const needle = selection.productName.toLowerCase();
    return masterProducts.filter((product) =>
      [product.name, product.issuer, product.isin, product.series, product.underlying, product.formulaText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [masterProducts, selection.productName]);

  const pivotData = useMemo(
    () =>
      results.map((p) => ({
        category: p.category,
        issuer: p.issuer ?? "Unknown",
        underlying: p.underlying ?? "Other",
        name: p.name,
        isin: p.isin ?? "—",
        tradeAmount: p.tradeAmount ?? 0,
        couponPercent: p.couponPercent ?? 0,
        listing: p.listing ?? "—",
      })),
    [results],
  );

  return (
    <AppPage dense title="Products">
      <Panel glow="cyan" className="!p-4">
        <SubTitle>Product Finder</SubTitle>
        <div className="mt-4">
          <ProductCombobox
            products={masterProducts}
            value={selection.productName}
            onSelect={(p) => selection.selectProduct(p)}
          />
        </div>
        <div className="mt-6">
          <PivotTable
            data={pivotData}
            defaultColumns={["category"]}
            defaultRows={["issuer"]}
            defaultValues={["tradeAmount"]}
            fields={[
              { key: "category", label: "Category", type: "text" },
              { key: "issuer", label: "Issuer", type: "text" },
              { key: "underlying", label: "Underlying", type: "text" },
              { key: "listing", label: "Listing", type: "text" },
              { key: "name", label: "Product", type: "text" },
              { key: "isin", label: "ISIN", type: "text" },
              { key: "tradeAmount", label: "Notional", type: "number" },
              { key: "couponPercent", label: "Coupon %", type: "number" },
            ]}
            title="Product Pivot"
            valueFormatter={(v, field) =>
              field === "couponPercent" ? formatPercent(v) : formatCurrency(v)
            }
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          {formatNumber(results.length)} products · Selected: {selection.resolvedProduct?.name ?? "None"}
        </p>
      </Panel>
    </AppPage>
  );
}

export function UploadDiagnosticsPage() {
  const { dataset, uploadState, isLoading, uploadWorkbook, resetToDemo } = useDataset();

  return (
    <AppPage dense title="Upload Master">
      <div className="space-y-4">
        <Panel glow="cyan">
          <SectionTitle icon={UploadIcon}>Upload New Product Master</SectionTitle>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Upload the latest New Product Master file (.xlsx).</li>
            <li>Confirm the Primary product universe parsed correctly.</li>
            <li>Review validation alerts before using valuation or payoff.</li>
          </ol>
          <label className="mt-6 inline-flex cursor-pointer">
            <Button variant="primary">{isLoading ? "Parsing..." : "Choose file"}</Button>
            <input
              accept=".xlsx,.xlsm"
              className="hidden"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadWorkbook(file);
              }}
            />
          </label>
          <Button className="mt-3 block" onClick={resetToDemo}>
            Reset to demo data
          </Button>
          <Output className="mt-4">{uploadState}</Output>
        </Panel>
        <Panel glow="purple">
          <SectionTitle>Validation</SectionTitle>
          <div className="mt-4">
            <DataTable>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {dataset.validationIssues.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No issues detected.</td>
                  </tr>
                ) : (
                  dataset.validationIssues.map((issue, i) => (
                    <tr key={`${issue.category}-${i}`}>
                      <td>{issue.category}</td>
                      <td>{issue.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </div>
        </Panel>
      </div>
      <Panel className="mt-4" glow="cyan">
        <SectionTitle>Product Count Verification</SectionTitle>
        <p className="mt-2 text-sm text-slate-500">
          Verified against the Excel master — Primary (4,533 products · 4,471 payoff formulae).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dataset.categorySummaries.map((entry, index) => (
            <motion.div
              key={entry.category}
              animate={{ opacity: 1, y: 0 }}
              className="kpi-card !p-4"
              initial={{ opacity: 0, y: 12 }}
              style={{ "--kpi-accent": categoryNeon[entry.category] } as CSSProperties}
              transition={{ delay: index * 0.06 }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{entry.category}</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatNumber(entry.productCount)}</p>
              <p className="text-xs text-slate-500">{formatCrores(entry.liveNotional)} notional</p>
            </motion.div>
          ))}
        </div>
      </Panel>
      <Panel className="mt-4" glow="cyan">
        <SectionTitle>Category Summary</SectionTitle>
        <div className="mt-4">
          <DataTable>
            <thead>
              <tr>
                <th>Category</th>
                <th>Products</th>
                <th>Formulas</th>
                <th>Notional</th>
                <th>Valuation</th>
                <th>Payoff</th>
              </tr>
            </thead>
            <tbody>
              {dataset.categorySummaries.map((entry) => (
                  <tr key={entry.category}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryNeon[entry.category] }} />
                        {entry.category}
                      </span>
                    </td>
                    <td>{formatNumber(entry.productCount)}</td>
                    <td>
                      {formatNumber(
                        dataset.products.filter((p) => p.category === entry.category && p.formulaText).length,
                      )}
                    </td>
                    <td>{formatCurrency(entry.liveNotional)}</td>
                    <td>
                      <Link className="text-cyan-400 underline" href={"/valuation" as Route}>
                        Open
                      </Link>
                    </td>
                    <td>
                      <Link className="text-purple-400 underline" href={"/payoff" as Route}>
                        Open
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </Panel>
    </AppPage>
  );
}

export function ProductDetailsPage() {
  const masterProducts = useMasterProducts();
  const selection = useProductSelection();
  const { asOf } = usePortfolioClock();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");

  const pool = useMemo(
    () => filterProductsByLifecycle(masterProducts, lifecycle, asOf),
    [masterProducts, lifecycle, asOf],
  );

  const product =
    selection.resolvedProduct && pool.some((p) => p.rowId === selection.resolvedProduct?.rowId)
      ? selection.resolvedProduct
      : pool[0];

  const canValue = product ? isValuationApplicable(product, asOf) : false;
  const lifecycleStatus = product ? getProductLifecycleStatus(product, asOf) : undefined;

  const valuation = product && canValue
    ? computeValuation(product, {
        valuationDate: selection.valuationDate,
        currentLevel: resolveLiveIndexLevel(product, {
          niftyLevel: Number(selection.niftyLevel) || undefined,
          sensexLevel: Number(selection.sensexLevel) || undefined,
        }),
        debentures: Math.max(1, Math.round(Number(selection.debentures) || 100)),
        purchasePrice: Number(selection.pricePerDebenture) || getDebenturePrice(product),
      })
    : null;

  const marketMove = useMemo(() => {
    if (!product) return 0;
    const entry = getIndexEntryLevel(product);
    const level = resolveLiveIndexLevel(product, {
      niftyLevel: Number(selection.niftyLevel) || undefined,
      sensexLevel: Number(selection.sensexLevel) || undefined,
    });
    return entry > 0 ? level / entry - 1 : 0;
  }, [product, selection.niftyLevel, selection.sensexLevel]);

  const scenarios = product?.formulaText
    ? buildEnhancedPayoffScenarioTable(
        product,
        {
          debentures: Math.max(1, Math.round(Number(selection.debentures) || 100)),
          pricePerDebenture: Number(selection.pricePerDebenture) || getDebenturePrice(product),
          remainingTenorDays: getPayoffTenorDays(product),
        },
        marketMove,
      )
    : [];

  const specCards = product
    ? [
        { label: "Category", value: product.category },
        { label: "Issuer", value: product.issuer ?? "—" },
        { label: "ISIN", value: product.isin ?? "—" },
        { label: "Entry Level", value: String(rawField(product, "Entry Level", "Initial Level") ?? getIndexEntryLevel(product)) },
        { label: "Maturity", value: product.maturityRaw ?? "—" },
        { label: "Notional", value: formatCrores(product.tradeAmount ?? 0) },
      ]
    : [];

  return (
    <AppPage dense title="Product Details">
      <HorizontalBand>
        <LifecycleProductList
          compact
          filter={lifecycle}
          products={masterProducts}
          selectedId={product?.rowId}
          onFilterChange={setLifecycle}
          onSelect={(p) => selection.selectProduct(p)}
        />
      </HorizontalBand>

      {!product ? (
        <HorizontalBand className="mt-4">
          <Panel>
            <Output>No products in this lifecycle bucket — switch category or upload master data.</Output>
          </Panel>
        </HorizontalBand>
      ) : (
        <div className="mt-4 space-y-4">
          <HorizontalBand>
            <Panel className="!p-4" glow="cyan">
              <SubTitle>Desk Inputs</SubTitle>
              <div className="mt-3">
                <ExcelInputPanel category={product.category} compact mode="valuation" products={pool} />
              </div>
            </Panel>
          </HorizontalBand>

          <HorizontalBand>
            <RevealOutput label="Click here to view product output">
              {!canValue ? (
                <Panel className="!p-5" glow="purple">
                  <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-amber-200">
                    {lifecycleStatus ? LIFECYCLE_STATUS_LABELS[lifecycleStatus] : "Inactive"}
                  </p>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Live valuation not applicable — product overview and payoff remain below.
                  </p>
                </Panel>
              ) : (
                <KpiBand
                  accents={["cyan", "purple", "green"]}
                  items={[
                    { label: "Current Value", value: formatProductUnitValue(valuation?.productValue ?? 0) },
                    { label: "Abs. Return", value: formatPercent(valuation?.absReturn ?? 0) },
                    { label: "IRR", value: formatPercent(valuation?.productIrr ?? 0) },
                  ]}
                />
              )}

              <HorizontalBand className="mt-4">
                <ProductNarrative product={product} />
              </HorizontalBand>

              {product.formulaText ? (
                <HorizontalBand className="mt-4">
                  <PayoffCurvePanel
                    entryLevel={getIndexEntryLevel(product)}
                    formula={product.formulaText}
                    marketMove={marketMove}
                    title={product.name}
                  />
                </HorizontalBand>
              ) : null}

              <HorizontalBand className="mt-4">
                <HorizontalRail>
                  {specCards.map((spec) => (
                    <RailCard key={spec.label} minWidth="min-w-[160px]">
                      <div className="spec-rail-card">
                        <p className="spec-rail-label">{spec.label}</p>
                        <p className={cn("spec-rail-value", spec.label === "ISIN" && "font-mono text-xs")}>{spec.value}</p>
                      </div>
                    </RailCard>
                  ))}
                </HorizontalRail>
              </HorizontalBand>

              <HorizontalBand className="mt-4">
                <Panel glow="cyan" className="!p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle>Payoff Scenarios</SectionTitle>
                    <Button variant="ghost" onClick={() => downloadProductsExcel([product], `SP-Details-${product.isin ?? "product"}.xlsx`)}>
                      Download
                    </Button>
                  </div>
                  <div className="mt-3 max-h-80 overflow-auto">
                    <DataTable>
                      <thead>
                        <tr>
                          <th>Final Fixing</th>
                          <th>Z</th>
                          <th>Return</th>
                          <th>IRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarios.map((row) => (
                          <tr
                            key={`${row.performance}-${row.isPivot ? "p" : "b"}${row.isCurrent ? "c" : ""}`}
                            className={cn(row.isPivot && "pivot-row", row.isCurrent && "current-row")}
                          >
                            <td>{formatNumber(row.finalFixing)}</td>
                            <td>{formatPercent(row.performance, 1)}</td>
                            <td>{formatFormulaReturn(row.maturityValue)}</td>
                            <td>{formatPercent(row.irr, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>
                </Panel>
              </HorizontalBand>
            </RevealOutput>
          </HorizontalBand>
        </div>
      )}
    </AppPage>
  );
}
