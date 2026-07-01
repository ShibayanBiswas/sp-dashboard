"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";

import { LogicFlowDiagram, LogicModuleCard } from "@/components/reference/logic-flow-diagram";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
import {
  AppPage,
  Button,
  DataTable,
  KpiBand,
  Panel,
  SectionInfo,
  SectionTitle,
  SubTitle,
} from "@/components/layout/app-ui";
import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { useDataset } from "@/lib/context/dataset-provider";
import { useMasterProducts } from "@/lib/hooks/use-master-products";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import {
  getCategoryIntelligenceMap,
  getComputationPrimitives,
  getDisconnectedNodes,
  isPipelineComplete,
  logicModules,
  LOGIC_ATLAS_AUTHOR,
  type LogicNode,
} from "@/lib/logic-atlas";
import { categoryNeon } from "@/lib/chart-theme";
import { SECTION_INFO } from "@/lib/section-info";
import { cn, formatCrores, formatNumber } from "@/lib/utils";

const DESK_LINKS: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/portfolio/analytics", label: "Analytics Lab" },
  { href: "/valuation", label: "Valuation" },
  { href: "/payoff", label: "Payoff" },
  { href: "/upload", label: "Upload Master" },
];

export function LogicAtlasConsole() {
  const { dataset } = useDataset();
  const masterProducts = useMasterProducts();
  const { asOf } = usePortfolioClock();
  const [selectedId, setSelectedId] = useState(logicModules[0]?.id);
  const [activeNode, setActiveNode] = useState<LogicNode | null>(null);

  const selected = logicModules.find((m) => m.id === selectedId) ?? logicModules[0];
  const categoryMap = getCategoryIntelligenceMap();
  const primitives = getComputationPrimitives();
  const disconnected = useMemo(() => getDisconnectedNodes(selected), [selected]);
  const pipelineOk = isPipelineComplete(selected);

  const stats = useMemo(
    () => getPortfolioHeadlineStats({ ...dataset, products: masterProducts }, asOf),
    [dataset, masterProducts, asOf],
  );

  const totalStages = logicModules.reduce((s, m) => s + m.nodes.length, 0);
  const completeModules = logicModules.filter(isPipelineComplete).length;

  return (
    <AppPage
      dense
      subtitle="Valuation, payoff, and portfolio analytics pipelines"
      title="Intel · Logic Atlas"
    >
      <HorizontalBand>
        <SectionInfo {...SECTION_INFO["intel-overview"]} />
      </HorizontalBand>

      <HorizontalBand className="mt-1">
        <KpiBand
          accents={["cyan", "purple", "green", "amber", "rose"]}
          items={[
            { label: "Logic Modules", value: formatNumber(logicModules.length) },
            { label: "Pipeline Stages", value: formatNumber(totalStages) },
            { label: "Valid Products", value: formatNumber(masterProducts.length) },
            { label: "Ongoing", value: formatNumber(stats.ongoingCount) },
            { label: "Live Notional", value: formatCrores(stats.liveNotional) },
          ]}
        />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionTitle>Reference Logic Modules</SectionTitle>
              <p className="mt-1 text-sm text-stone-500">
                {completeModules} of {logicModules.length} pipelines fully connected · desk author {LOGIC_ATLAS_AUTHOR}
              </p>
            </div>
            <HorizontalRail className="!mt-0 shrink-0">
              {DESK_LINKS.map((link) => (
                <RailCard key={link.href} minWidth="min-w-0">
                  <Link href={link.href}>
                    <Button className="whitespace-nowrap text-xs" variant="ghost">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link.label}
                    </Button>
                  </Link>
                </RailCard>
              ))}
            </HorizontalRail>
          </div>
          <HorizontalRail className="mt-4">
            {logicModules.map((module) => (
              <RailCard key={module.id} minWidth="min-w-[300px] md:min-w-[340px]">
                <LogicModuleCard
                  module={module}
                  pipelineComplete={isPipelineComplete(module)}
                  selected={selectedId === module.id}
                  onSelect={() => {
                    setSelectedId(module.id);
                    setActiveNode(null);
                  }}
                />
              </RailCard>
            ))}
          </HorizontalRail>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionInfo {...SECTION_INFO["intel-pipeline"]} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <SubTitle>Pipeline Flow</SubTitle>
              <h3 className="mt-1 text-lg font-bold text-ink">{selected.title}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-500">{selected.purpose}</p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]",
                pipelineOk
                  ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-800"
                  : "border-amber-400/35 bg-amber-500/10 text-amber-900",
              )}
            >
              {pipelineOk ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pipeline complete
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {disconnected.length} orphaned node{disconnected.length === 1 ? "" : "s"}
                </>
              )}
            </span>
          </div>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-2">
            <LogicFlowDiagram
              activeNodeId={activeNode?.id}
              horizontal
              module={selected}
              onNodeSelect={setActiveNode}
            />
          </div>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="!p-4" glow="purple">
            <SectionTitle>{activeNode ? activeNode.label : "Module Intelligence"}</SectionTitle>
            {activeNode ? (
              <div className="mt-3 space-y-3">
                <span className="status-badge status-badge-perpetual">{activeNode.kind}</span>
                <p className="text-sm leading-7 text-stone-700">{activeNode.description}</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {selected.insights.map((insight, i) => (
                  <li key={i} className="text-sm leading-7 text-stone-600">
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="!p-4" glow="cyan">
            <SectionTitle>Module Outputs</SectionTitle>
            <ul className="mt-3 space-y-2">
              {selected.outputs.map((output) => (
                <li
                  key={output}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
                >
                  {output}
                </li>
              ))}
            </ul>
            {!pipelineOk ? (
              <p className="mt-4 text-xs text-amber-900/90">
                Orphaned: {disconnected.map((n) => n.label).join(", ")}
              </p>
            ) : null}
          </Panel>
        </div>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionTitle>Primary Portfolio Command</SectionTitle>
          <p className="mt-1 text-sm text-stone-500">Category lane routing into valuation, payoff, and analytics surfaces</p>
          <HorizontalRail className="mt-4">
            {categoryMap.map((row) => (
              <RailCard key={row.category} minWidth="min-w-[280px]">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryNeon[row.category] }} />
                    <p className="font-bold text-ink">{row.category}</p>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wider text-stone-500">Data lane</p>
                  <p className="text-sm text-stone-700">{row.dataLane}</p>
                  <p className="mt-3 text-xs uppercase tracking-wider text-stone-500">Valuation</p>
                  <p className="text-sm text-stone-700">{row.valuationPath}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-stone-500">Payoff</p>
                  <p className="text-sm text-stone-700">{row.payoffPath}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.keySignals.map((signal) => (
                      <span key={signal} className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] text-gold-dark/80">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </RailCard>
            ))}
          </HorizontalRail>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionInfo {...SECTION_INFO["intel-primitives"]} />
          <SectionTitle>Computation Primitives</SectionTitle>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
            <DataTable>
              <thead>
                <tr>
                  <th>Primitive</th>
                  <th>Category</th>
                  <th className="text-right">Uses</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {primitives.map((p, index) => (
                  <tr key={p.name} className={cn(index % 2 === 1 && "data-table-row-alt")}>
                    <td className="font-medium text-ink">{p.name}</td>
                    <td>
                      <span className="status-badge status-badge-perpetual">{p.category}</span>
                    </td>
                    <td className="text-right font-mono text-xs tabular-nums text-maroon">{formatNumber(p.count)}</td>
                    <td className="text-stone-600">{p.role}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Panel>
      </HorizontalBand>
    </AppPage>
  );
}
