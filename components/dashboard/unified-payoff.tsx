"use client";

import { useMemo, useState } from "react";

import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { PayoffCurvePanel } from "@/components/dashboard/payoff-curve";
import { ProductNarrative } from "@/components/dashboard/product-narrative";
import { RevealOutput } from "@/components/ui/reveal-output";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
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
  LIFECYCLE_FILTERS,
  LIFECYCLE_FILTER_LABELS,
  type LifecycleFilter,
} from "@/lib/product-lifecycle";
import { getDebenturePrice, getIndexEntryLevel, getTargetLevel, isSensexLinked, rawField, resolveLiveIndexLevel, resolveValuationLevel } from "@/lib/product-utils";
import { describePayoffBand } from "@/lib/product-narrative-format";
import { PayoffScenariosTable } from "@/components/ui/payoff-scenarios-table";
import type { ProductRecord } from "@/lib/types";
import { buildEnhancedPayoffScenarioTable, type PayoffRowFlags } from "@/lib/workbook/payoff-pivots";
import { getPayoffTenorDays } from "@/lib/workbook/payoff-scenarios";
import { downloadProductsExcel } from "@/lib/workbook/export-products";
import { cn, formatCrores, formatNumber, formatPercent } from "@/lib/utils";

const TABS = [
  { id: "details", label: "Non-PP SP Details" },
  { id: "search", label: "Product Search" },
];

export function UnifiedPayoffDashboard() {
  const { dataset } = useDataset();
  const selection = useProductSelection();
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");
  const [tab, setTab] = useState("details");

  const pool = useMemo(
    () => filterProductsByLifecycle(dataset.products, lifecycle),
    [dataset.products, lifecycle],
  );

  const product =
    selection.resolvedProduct && pool.some((p) => p.rowId === selection.resolvedProduct?.rowId)
      ? selection.resolvedProduct
      : pool[0];

  const marketMove = useMemo(() => {
    if (!product) return 0;
    const entry = getIndexEntryLevel(product);
    const level = resolveLiveIndexLevel(product, {
      niftyLevel: Number(selection.niftyLevel) || undefined,
      sensexLevel: Number(selection.sensexLevel) || undefined,
    });
    return entry > 0 ? level / entry - 1 : 0;
  }, [product, selection.niftyLevel, selection.sensexLevel]);

  const payoffBandNote = useMemo(() => {
    if (!product?.formulaText) return undefined;
    return describePayoffBand(product.formulaText, marketMove);
  }, [product, marketMove]);

  const scenarios = useMemo(() => {
    if (!product?.formulaText) return [];
    return buildEnhancedPayoffScenarioTable(
      product,
      {
        debentures: Math.max(1, Math.round(Number(selection.debentures) || 100)),
        pricePerDebenture: Number(selection.pricePerDebenture) || getDebenturePrice(product),
        remainingTenorDays: getPayoffTenorDays(product),
      },
      marketMove,
    );
  }, [product, selection.debentures, selection.pricePerDebenture, marketMove]);

  const livePayoffIrr = useMemo(() => {
    const live = scenarios.find((r) => r.isCurrent);
    return live?.irr ?? 0;
  }, [scenarios]);

  const targetDisplay = useMemo(() => {
    if (!product) return "—";
    const target = getTargetLevel(product);
    if (target) return formatNumber(target);
    const raw = rawField(product, "Target Nifty", "Target Level");
    if (raw) return raw;
    return "—";
  }, [product]);

  return (
    <AppPage dense title="Payoff">
      <HorizontalBand>
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["pay-filter"]} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubTitle>Primary Payoff · Portfolio Filter</SubTitle>
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_FILTERS.map((key) => (
                <Button
                  key={key}
                  active={lifecycle === key}
                  className={lifecycle === key ? "btn-pill-purple-active" : undefined}
                  variant="pill"
                  onClick={() => setLifecycle(key)}
                >
                  {LIFECYCLE_FILTER_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <SubPageTabs active={tab} onSelect={setTab} tabs={TABS} />
      </HorizontalBand>

      {tab === "details" ? (
        <NonPpSpDetails
          livePayoffIrr={livePayoffIrr}
          marketMove={marketMove}
          payoffBandNote={payoffBandNote}
          pool={pool}
          product={product}
          scenarios={scenarios}
          targetDisplay={targetDisplay}
        />
      ) : null}
      {tab === "search" ? <ProductSearchTab products={pool} selectedId={product?.rowId} /> : null}
    </AppPage>
  );
}

function NonPpSpDetails({
  livePayoffIrr,
  marketMove,
  payoffBandNote,
  pool,
  product,
  scenarios,
  targetDisplay,
}: {
  livePayoffIrr: number;
  marketMove: number;
  payoffBandNote?: string;
  pool: ProductRecord[];
  product?: ProductRecord;
  scenarios: PayoffRowFlags[];
  targetDisplay: string;
}) {
  const selection = useProductSelection();
  const liveLevel = product
    ? resolveLiveIndexLevel(product, {
        niftyLevel: Number(selection.niftyLevel) || undefined,
        sensexLevel: Number(selection.sensexLevel) || undefined,
      })
    : 0;
  const indexLabel = product && isSensexLinked(product) ? "Sensex" : "Nifty";
  return (
    <>
      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionInfo {...SECTION_INFO["pay-inputs"]} />
          <SectionTitle>Non-PP SP Details · Input</SectionTitle>
          <p className="mt-1 text-sm italic text-amber-200/90">Change the highlighted cells based on the client deal</p>
          <div className="mt-3">
            <ExcelInputPanel category={product?.category ?? "Primary"} compact mode="payoff" products={pool} />
          </div>
        </Panel>
      </HorizontalBand>

      {product ? (
        <>
          <HorizontalBand className="mt-4">
            <RevealOutput label="Click here to view payoff output">
              <KpiBand
                accents={["cyan", "purple", "green"]}
                items={[
                  { label: `Live ${indexLabel} Level`, value: formatNumber(liveLevel) },
                  { label: "Initial Fixing", value: formatNumber(getIndexEntryLevel(product)) },
                  { label: "Target Level", value: targetDisplay },
                  { label: "Live Index Move", value: formatPercent(marketMove, 1) },
                  { label: "XIRR @ live move", value: formatPercent(livePayoffIrr, 2) },
                ]}
              />
              {payoffBandNote ? (
                <p className="mt-2 text-center text-xs italic text-amber-200/90">{payoffBandNote}</p>
              ) : null}

              <HorizontalBand className="mt-4">
                <ProductNarrative product={product} />
              </HorizontalBand>
              {product.formulaText ? (
                <PayoffCurvePanel
                  entryLevel={getIndexEntryLevel(product)}
                  formula={product.formulaText}
                  marketMove={marketMove}
                  title={product.name}
                />
              ) : null}

              <HorizontalBand className="mt-4">
                <HorizontalRail>
                  <RailCard minWidth="min-w-full">
                    <ProductSpecifications product={product} />
                  </RailCard>
                </HorizontalRail>
              </HorizontalBand>

              <HorizontalBand className="mt-4">
                <Panel className="!p-4" glow="cyan">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle>Product Payoff</SectionTitle>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        downloadProductsExcel([product], `SP-Payoff-${product.isin ?? product.name}.xlsx`, {
                          sheetName: "Payoff",
                        })
                      }
                    >
                      Download
                    </Button>
                  </div>
                  <SectionInfo {...SECTION_INFO["pay-output"]} />
                  <div className="mt-3 max-h-[min(56vh,560px)] overflow-auto">
                    <PayoffScenariosTable rows={scenarios} />
                  </div>
                </Panel>
              </HorizontalBand>
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

function ProductSpecifications({ product }: { product: ProductRecord }) {
  const target = getTargetLevel(product) ?? rawField(product, "Target Level", "Target Nifty ");
  const specs: Array<{ label: string; value: string }> = [
    { label: "Issuer", value: product.issuer ?? rawField(product, "Issuer", "Issuer Name") ?? "—" },
    { label: "ISIN", value: product.isin ?? "—" },
    { label: "Product Code", value: product.series ?? rawField(product, "Product Code") ?? "—" },
    { label: "Trade Date", value: rawField(product, "Trade Date", "Trade Date/Opening date") ?? "—" },
    { label: "Allotment Date", value: rawField(product, "Allotment Date") ?? "—" },
    { label: "Underlying", value: product.underlying ?? "—" },
    { label: "Initial Fixing", value: formatNumber(getIndexEntryLevel(product)) },
    { label: "Target Level", value: target ? String(target) : "—" },
    { label: "Final Obs. Date", value: product.lastObservationDateRaw ?? rawField(product, "Final Observation Date", "Last Observation Date") ?? "—" },
    { label: "Redemption Date", value: product.maturityRaw ?? rawField(product, "Redemption Date", "Maturity Date") ?? "—" },
    { label: "PP / Non-PP", value: product.principalProtection ?? rawField(product, "PP/Non PP", "Principal Protection") ?? "—" },
    { label: "Listed / Unlisted", value: product.listing ?? rawField(product, "Listed/Unlisted", "Listing") ?? "—" },
    { label: "Payoff Tenor · Days", value: rawField(product, "Payoff Tenor(Days)", "Payoff Tenor (Days)", "Payoff Tenor") ?? "—" },
    { label: "Tenor · Days", value: product.tenorDays ? formatNumber(product.tenorDays) : rawField(product, "Tenor(Days)", "Tenor (Days)") ?? "—" },
  ];

  return (
    <Panel className="!p-4" glow="purple">
      <SectionTitle>Product Specifications</SectionTitle>
      <HorizontalRail className="mt-4">
        {specs.map((spec) => (
          <RailCard key={spec.label} minWidth="min-w-[168px]">
            <div className="spec-rail-card border-0 bg-transparent p-0 shadow-none">
              <p className="spec-rail-label">{spec.label}</p>
              <p className={cn("spec-rail-value", spec.label === "ISIN" && "font-mono text-xs")}>{spec.value}</p>
            </div>
          </RailCard>
        ))}
      </HorizontalRail>
    </Panel>
  );
}

function ProductSearchTab({ products, selectedId }: { products: ProductRecord[]; selectedId?: string }) {
  const selection = useProductSelection();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const needle = query.toLowerCase();
    return products.filter((p) =>
      [p.name, p.isin, p.series, p.issuer, p.underlying]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [products, query]);

  const selectedName = selection.productName;

  return (
    <HorizontalBand className="mt-4">
      <Panel className="!p-4" glow="cyan">
        <SectionInfo {...SECTION_INFO["pay-search"]} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle>Product Search</SectionTitle>
            <p className="mt-1 text-sm text-slate-500">
              {formatNumber(filtered.length)} products · click a row to load it into the payoff interface
            </p>
          </div>
          <input
            className="input-glow w-full max-w-md rounded-xl px-4 py-2.5 text-sm outline-none"
            placeholder="Search by ISIN, name, series, underlying…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 max-h-[min(66vh,680px)] overflow-auto">
          <DataTable>
            <thead>
              <tr>
                <th>Name on Signup Form</th>
                <th>Series</th>
                <th>ISIN No.</th>
                <th>Underlying</th>
                <th>Initial Fixing</th>
                <th>Maturity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isActive = p.rowId === selectedId || p.name === selectedName;
                return (
                  <tr
                    key={p.rowId}
                    className={cn(
                      "cursor-pointer transition",
                      isActive ? "bg-cyan-500/15 ring-1 ring-inset ring-cyan-400/40" : "hover:bg-white/5",
                    )}
                    onClick={() => selection.selectProduct(p)}
                  >
                    <td className="max-w-[280px] truncate font-medium">{p.name}</td>
                    <td>{p.series ?? "—"}</td>
                    <td className="font-mono text-xs">{p.isin ?? "—"}</td>
                    <td>{p.underlying ?? "—"}</td>
                    <td>{formatNumber(getIndexEntryLevel(p))}</td>
                    <td>{p.maturityRaw ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </div>
      </Panel>
    </HorizontalBand>
  );
}
