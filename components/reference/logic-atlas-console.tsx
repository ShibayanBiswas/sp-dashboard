"use client";

import Link from "next/link";
import type { Route } from "next";

import { LogicFlowDiagram, LogicModuleCard } from "@/components/reference/logic-flow-diagram";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
import {
  AppPage,
  DataTable,
  KpiBand,
  Panel,
  SectionTitle,
  SubTitle,
} from "@/components/layout/app-ui";
import {
  getCategoryIntelligenceMap,
  getComputationPrimitives,
  logicModules,
  type LogicNode,
} from "@/lib/logic-atlas";
import { categoryNeon } from "@/lib/chart-theme";
import { formatNumber } from "@/lib/utils";
import { useState } from "react";

export function LogicAtlasConsole() {
  const [selectedId, setSelectedId] = useState(logicModules[0]?.id);
  const [activeNode, setActiveNode] = useState<LogicNode | null>(null);
  const selected = logicModules.find((m) => m.id === selectedId) ?? logicModules[0];
  const categoryMap = getCategoryIntelligenceMap();
  const primitives = getComputationPrimitives();

  return (
    <AppPage dense title="Logic Atlas">
      <HorizontalBand>
        <KpiBand
          accents={["cyan", "purple", "green", "amber"]}
          items={[
            { label: "Logic Modules", value: formatNumber(logicModules.length) },
            { label: "Pipeline Stages", value: formatNumber(logicModules.reduce((s, m) => s + m.nodes.length, 0)) },
            { label: "Categories", value: formatNumber(categoryMap.length) },
            { label: "Primitives", value: formatNumber(primitives.length) },
          ]}
        />
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionTitle>Reference Logic Modules</SectionTitle>
          <p className="mt-1 text-sm text-slate-500">Slide horizontally to browse all logic surfaces</p>
          <HorizontalRail className="mt-4">
            {logicModules.map((module) => (
              <RailCard key={module.id} minWidth="min-w-[300px] md:min-w-[340px]">
                <LogicModuleCard
                  module={module}
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
          <SubTitle>Pipeline Flow</SubTitle>
          <h3 className="mt-1 text-lg font-bold">{selected.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">{selected.purpose}</p>
          <div className="mt-4">
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
        <Panel className="!p-4" glow="purple">
          <SectionTitle>{activeNode ? activeNode.label : "Module Intelligence"}</SectionTitle>
          {activeNode ? (
            <p className="mt-3 text-sm leading-7 text-slate-400">{activeNode.description}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selected.insights.map((insight, i) => (
                <li key={i} className="text-sm leading-7 text-slate-400">
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionTitle>Primary Portfolio Command</SectionTitle>
          <HorizontalRail className="mt-4">
            {categoryMap.map((row) => (
              <RailCard key={row.category} minWidth="min-w-[260px]">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryNeon[row.category] }} />
                    <p className="font-bold">{row.category}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{row.valuationPath}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.payoffPath}</p>
                </div>
              </RailCard>
            ))}
          </HorizontalRail>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionTitle>Computation Primitives</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <DataTable>
              <thead>
                <tr>
                  <th>Primitive</th>
                  <th>Source</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {primitives.map((p) => (
                  <tr key={p.name}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.role}</td>
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
