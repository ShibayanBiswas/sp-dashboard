"use client";

import Link from "next/link";
import type { Route } from "next";

import { LogicFlowDiagram } from "@/components/reference/logic-flow-diagram";
import { HorizontalBand, HorizontalRail, RailCard } from "@/components/layout/horizontal-rail";
import { AppPage, Button, Panel, SectionTitle } from "@/components/layout/app-ui";
import { logicModules } from "@/lib/logic-atlas";
import { categoryNeon } from "@/lib/chart-theme";
import { categoryQuickLinks } from "@/lib/navigation";
import { useDataset } from "@/lib/context/dataset-provider";
import { formatCrores, formatNumber } from "@/lib/utils";

export function DeskHubPage() {
  const { dataset } = useDataset();
  const primaryModule = logicModules.find((m) => m.id === "primary-valuation") ?? logicModules[0];

  return (
    <AppPage dense title="Desk">
      <HorizontalBand>
        <Panel className="!p-4" glow="cyan">
          <SectionTitle>Valuation And Payoff</SectionTitle>
          <HorizontalRail className="mt-4">
            <RailCard minWidth="min-w-[220px]">
              <Link href={"/valuation" as Route}>
                <Button className="w-full" variant="primary">
                  Open Valuation
                </Button>
              </Link>
            </RailCard>
            <RailCard minWidth="min-w-[220px]">
              <Link href={"/payoff" as Route}>
                <Button className="w-full" variant="primary">
                  Open Payoff
                </Button>
              </Link>
            </RailCard>
          </HorizontalRail>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="purple">
          <SectionTitle>Primary Portfolio Command</SectionTitle>
          <p className="mt-1 text-sm text-stone-500">Horizontal flow across the Primary valuation pipeline</p>
          <div className="mt-4">
            <LogicFlowDiagram horizontal module={primaryModule} />
          </div>
        </Panel>
      </HorizontalBand>

      <HorizontalBand className="mt-4">
        <Panel className="!p-4" glow="cyan">
          <SectionTitle>Category Lanes</SectionTitle>
          <HorizontalRail className="mt-4">
            {categoryQuickLinks.map((link) => {
              const count = dataset.products.filter((p) => p.category === link.category).length;
              const notional = dataset.products
                .filter((p) => p.category === link.category)
                .reduce((s, p) => s + (p.tradeAmount ?? 0), 0);
              return (
                <RailCard key={link.category} minWidth="min-w-[280px] max-w-[360px]">
                  <div className="min-h-[120px] rounded-xl border border-stone-200 bg-stone-50 p-5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryNeon[link.category] }} />
                      <p className="font-bold">{link.category}</p>
                    </div>
                    <p className="mt-2 text-sm text-stone-500">{formatNumber(count)} products</p>
                    <p className="text-sm text-stone-500">{formatCrores(notional)}</p>
                  </div>
                </RailCard>
              );
            })}
          </HorizontalRail>
        </Panel>
      </HorizontalBand>
    </AppPage>
  );
}
