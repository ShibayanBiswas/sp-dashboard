"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, Upload as UploadIcon } from "lucide-react";

import { PayoffCurvePanel } from "@/components/dashboard/payoff-curve";
import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { ProductNarrative } from "@/components/dashboard/product-narrative";
import { ProductCombobox } from "@/components/ui/product-combobox";
import { PivotTable } from "@/components/ui/pivot-table";
import {
  AppPage,
  Button,
  DataTable,
  FieldGrid,
  FieldRow,
  Input,
  KpiBand,
  Output,
  OutputGlow,
  Panel,
  SectionTitle,
  SubTitle,
} from "@/components/layout/app-ui";
import { categoryNeon } from "@/lib/chart-theme";
import { useProductSelection } from "@/lib/context/product-selection-provider";
import { useDataset } from "@/lib/context/dataset-provider";
import { getEntryLevel, getTargetLevel, rawField } from "@/lib/product-utils";
import { buildPayoffScenarioTable } from "@/lib/workbook/payoff-scenarios";
import { computeValuation } from "@/lib/workbook/valuation-engine";
import { formatCrores, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function ProductSearchPage() {
  const { dataset } = useDataset();
  const selection = useProductSelection();

  const results = useMemo(() => {
    if (!selection.productName) return dataset.products;
    const needle = selection.productName.toLowerCase();
    return dataset.products.filter((product) =>
      [product.name, product.issuer, product.isin, product.series, product.underlying, product.formulaText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [dataset.products, selection.productName]);

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
            products={dataset.products}
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
  const { dataset } = useDataset();
  const selection = useProductSelection();
  const product = selection.resolvedProduct;

  const valuation = product
    ? computeValuation(product, {
        valuationDate: selection.valuationDate,
        currentLevel: Number(selection.currentLevel) || getEntryLevel(product),
        debentures: Number(selection.debentures) || 100,
      })
    : null;

  const scenarios = product?.formulaText
    ? buildPayoffScenarioTable(product, {
        currentLevel: Number(selection.currentLevel) || getEntryLevel(product),
        debentures: Number(selection.debentures) || 100,
      }).slice(0, 8)
    : [];

  return (
    <AppPage dense title="Product Details">
      <Panel glow="cyan" className="mb-6">
        <SubTitle>Select Product</SubTitle>
        <div className="mt-3">
          <ExcelInputPanel
            category={product?.category ?? "Primary"}
            mode="valuation"
            products={dataset.products}
          />
        </div>
      </Panel>

      {!product ? (
        <Panel>
          <Output>Select a product from the dropdown above or the Products page.</Output>
        </Panel>
      ) : (
        <div className="space-y-4">
          <KpiBand
            accents={["cyan", "purple", "green"]}
            items={[
              { label: "Product Value", value: formatCurrency(valuation?.productValue ?? 0) },
              { label: "Abs. Return", value: formatPercent(valuation?.absReturn ?? 0) },
              { label: "IRR", value: formatPercent(valuation?.productIrr ?? 0) },
            ]}
          />
        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-4">
            <ProductNarrative product={product} />
            <Panel glow="purple" className="!p-4">
              <SectionTitle icon={FileSpreadsheet}>Specifications</SectionTitle>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <FieldRow label="Category">
                  <OutputGlow accent="cyan">{product.category}</OutputGlow>
                </FieldRow>
                <FieldRow label="Issuer">
                  <Output>{product.issuer ?? "—"}</Output>
                </FieldRow>
                <FieldRow label="ISIN">
                  <Output className="font-mono">{product.isin ?? "—"}</Output>
                </FieldRow>
                <FieldRow label="Entry Level">
                  <OutputGlow accent="purple">
                    {rawField(product, "Entry Level", "Initial Level") ?? getEntryLevel(product)}
                  </OutputGlow>
                </FieldRow>
              </div>
            </Panel>
            <Panel glow="cyan" className="!p-4">
              <SectionTitle>Payoff Scenarios</SectionTitle>
              <div className="mt-3 max-h-64 overflow-auto">
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
                      <tr key={row.performance}>
                        <td>{formatNumber(row.finalFixing)}</td>
                        <td>{formatPercent(row.z)}</td>
                        <td>{formatPercent(row.maturityValue)}</td>
                        <td>{formatPercent(row.irr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </Panel>
          </div>
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 12 }}>
            {product.formulaText ? (
              <PayoffCurvePanel
                entryLevel={getEntryLevel(product)}
                formula={product.formulaText}
                title={product.name}
              />
            ) : (
              <Panel>
                <Output>Payoff analysis unavailable for this product.</Output>
              </Panel>
            )}
          </motion.div>
        </div>
        </div>
      )}
    </AppPage>
  );
}
