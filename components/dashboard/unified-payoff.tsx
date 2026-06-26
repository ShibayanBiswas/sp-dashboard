"use client";

import { useMemo, useState } from "react";

import { ExcelInputPanel } from "@/components/dashboard/excel-input-panel";
import { PayoffCurvePanel } from "@/components/dashboard/payoff-curve";
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
import { getEntryLevel, getTargetLevel, rawField } from "@/lib/product-utils";
import type { ProductRecord } from "@/lib/types";
import { buildPayoffScenarioTable } from "@/lib/workbook/payoff-scenarios";
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

  const scenarios = useMemo(() => {
    if (!product?.formulaText) return [];
    return buildPayoffScenarioTable(product, {
      currentLevel: Number(selection.currentLevel) || getEntryLevel(product),
      debentures: Number(selection.debentures) || 100,
      pricePerDebenture: Number(selection.pricePerDebenture) || undefined,
      remainingTenorDays: product.tenorDays,
    });
  }, [product, selection.currentLevel, selection.debentures, selection.pricePerDebenture]);

  const anchor = scenarios.find((r) => Math.abs(r.performance) < 0.001) ?? scenarios[Math.floor(scenarios.length / 2)];

  return (
    <AppPage dense title="Payoff">
      <HorizontalBand>
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["pay-filter"]} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubTitle>Primary Payoff · Portfolio Filter</SubTitle>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIFECYCLE_FILTER_LABELS) as LifecycleFilter[]).map((key) => (
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
        <NonPpSpDetails anchor={anchor} pool={pool} product={product} scenarios={scenarios} />
      ) : null}
      {tab === "search" ? <ProductSearchTab products={pool} selectedId={product?.rowId} /> : null}
    </AppPage>
  );
}

function NonPpSpDetails({
  anchor,
  pool,
  product,
  scenarios,
}: {
  anchor: ReturnType<typeof buildPayoffScenarioTable>[number] | undefined;
  pool: ProductRecord[];
  product?: ProductRecord;
  scenarios: ReturnType<typeof buildPayoffScenarioTable>;
}) {
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
            <KpiBand
              accents={["cyan", "purple", "green", "amber"]}
              items={[
                { label: "Entry Level", value: formatNumber(getEntryLevel(product)) },
                {
                  label: "Target Level",
                  value: String(getTargetLevel(product) ?? rawField(product, "Target Level") ?? "—"),
                },
                { label: "Scenario Return", value: formatPercent(anchor?.returnOnInvestment ?? 0) },
                { label: "Scenario IRR", value: formatPercent(anchor?.irr ?? 0) },
              ]}
            />
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <ProductNarrative product={product} />
          </HorizontalBand>

          <HorizontalBand className="mt-4">
            <ProductSpecifications product={product} />
          </HorizontalBand>

          {product.formulaText ? (
            <HorizontalBand className="mt-4">
              <PayoffCurvePanel entryLevel={getEntryLevel(product)} formula={product.formulaText} title={product.name} />
            </HorizontalBand>
          ) : null}

          <HorizontalBand className="mt-4">
            <Panel className="!p-4" glow="cyan">
              <SectionInfo {...SECTION_INFO["pay-output"]} />
              <SectionTitle>Product Payoff</SectionTitle>
              <p className="mt-1 text-sm text-slate-500">
                Maturity payoff across underlying scenarios — mirrors the Product Payoff table of the Excel dashboard.
              </p>
              <div className="mt-3 max-h-[min(56vh,560px)] overflow-auto">
                <DataTable>
                  <thead>
                    <tr>
                      <th>Final Fixing</th>
                      <th>Underlying&apos;s Performance</th>
                      <th>Product Returns</th>
                      <th>XIRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((row) => {
                      const isAnchor = Math.abs(row.performance) < 0.001;
                      return (
                        <tr key={row.performance} className={isAnchor ? "bg-cyan-500/10 font-semibold" : undefined}>
                          <td>{formatNumber(row.finalFixing)}</td>
                          <td>{formatPercent(row.performance)}</td>
                          <td>{formatPercent(row.maturityValue)}</td>
                          <td>{formatPercent(row.irr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </div>
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

function ProductSpecifications({ product }: { product: ProductRecord }) {
  const target = getTargetLevel(product) ?? rawField(product, "Target Level", "Target Nifty ");
  const specs: Array<{ label: string; value: string }> = [
    { label: "Issuer", value: product.issuer ?? rawField(product, "Issuer", "Issuer Name") ?? "—" },
    { label: "ISIN", value: product.isin ?? "—" },
    { label: "Product Code", value: product.series ?? rawField(product, "Product Code") ?? "—" },
    { label: "Trade Date", value: rawField(product, "Trade Date", "Trade Date/Opening date") ?? "—" },
    { label: "Allotment Date", value: rawField(product, "Allotment Date") ?? "—" },
    { label: "Underlying", value: product.underlying ?? "—" },
    { label: "Initial Fixing", value: formatNumber(getEntryLevel(product)) },
    { label: "Target Level", value: target ? String(target) : "—" },
    { label: "Final Obs. Date", value: product.lastObservationDateRaw ?? rawField(product, "Final Observation Date", "Last Observation Date") ?? "—" },
    { label: "Redemption Date", value: product.maturityRaw ?? rawField(product, "Redemption Date", "Maturity Date") ?? "—" },
    { label: "PP / Non-PP", value: product.principalProtection ?? rawField(product, "PP/Non PP", "Principal Protection") ?? "—" },
    { label: "Listed / Unlisted", value: product.listing ?? rawField(product, "Listed/Unlisted", "Listing") ?? "—" },
    { label: "Payoff Tenor (Days)", value: rawField(product, "Payoff Tenor(Days)", "Payoff Tenor (Days)", "Payoff Tenor") ?? "—" },
    { label: "Tenor (Days)", value: product.tenorDays ? formatNumber(product.tenorDays) : rawField(product, "Tenor(Days)", "Tenor (Days)") ?? "—" },
  ];

  return (
    <Panel className="!p-4" glow="purple">
      <SectionTitle>Product Specifications</SectionTitle>
      <p className="mt-1 text-sm text-slate-500">Deal terms sourced from the Primary master — one parameter per row.</p>
      <FieldStack>
        {specs.map((spec, index) => (
          <FieldRow key={spec.label} label={spec.label}>
            {index === 1 ? (
              <Output className="font-mono text-sm">{spec.value}</Output>
            ) : spec.label === "Underlying" || spec.label === "Initial Fixing" || spec.label === "Target Level" ? (
              <OutputGlow accent="cyan">{spec.value}</OutputGlow>
            ) : (
              <Output>{spec.value}</Output>
            )}
          </FieldRow>
        ))}
      </FieldStack>
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
              {filtered.slice(0, 500).map((p) => {
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
                    <td>{formatNumber(getEntryLevel(p))}</td>
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
