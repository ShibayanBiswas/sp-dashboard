"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, CheckCircle2, Database, Cpu, Search, LineChart, Wallet, Zap } from "lucide-react";

import type { LogicFlow, LogicModule, LogicNode, LogicNodeKind } from "@/lib/logic-atlas";
import { cn } from "@/lib/utils";

const kindIcons: Record<LogicNodeKind, typeof Database> = {
  input: Search,
  process: Cpu,
  engine: Zap,
  lookup: Database,
  output: LineChart,
};

const accentMap = {
  cyan: { border: "border-gold/40", bg: "bg-gold/10", text: "text-gold-dark", glow: "shadow-gold/20" },
  purple: { border: "border-maroon/30", bg: "bg-maroon/5", text: "text-maroon", glow: "shadow-maroon/15" },
  green: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-800", glow: "shadow-emerald-500/20" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-900", glow: "shadow-amber-500/20" },
  rose: { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-800", glow: "shadow-rose-500/20" },
};

function FlowNode({
  node,
  accent,
  index,
  active,
  onClick,
}: {
  node: LogicNode;
  accent: LogicModule["accent"];
  index: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const Icon = kindIcons[node.kind];
  const colors = accentMap[accent];

  return (
    <motion.button
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "logic-node group w-full rounded-2xl border p-4 text-left transition-all duration-300",
        colors.border,
        colors.bg,
        active && `ring-2 ring-offset-2 ring-offset-white ${colors.border}`,
        onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-lg",
        onClick && colors.glow,
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-xl p-2", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">{node.kind}</p>
          <p className="mt-1 font-semibold text-ink">{node.label}</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">{node.description}</p>
        </div>
      </div>
    </motion.button>
  );
}

function FlowArrow({ label, vertical }: { label?: string; vertical?: boolean }) {
  const Icon = vertical ? ArrowDown : ArrowRight;
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-1">
      <Icon className="h-4 w-4 text-gold-dark/70" />
      {label ? <span className="text-[9px] font-bold uppercase tracking-widest text-gold-dark/70">{label}</span> : null}
    </div>
  );
}

/** Topological layout: horizontal pipeline with animated connectors. */
export function LogicFlowDiagram({
  module,
  activeNodeId,
  onNodeSelect,
  horizontal = true,
}: {
  module: LogicModule;
  activeNodeId?: string;
  onNodeSelect?: (node: LogicNode) => void;
  horizontal?: boolean;
}) {
  const ordered = orderNodes(module.nodes, module.flows);

  if (horizontal) {
    return (
      <div className="horizontal-rail -mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-min snap-x snap-mandatory items-stretch gap-2">
          {ordered.map((node, index) => {
            const flow = module.flows.find((f) => f.from === ordered[index - 1]?.id && f.to === node.id);
            return (
              <div key={node.id} className="flex min-w-[280px] max-w-[360px] snap-start items-center gap-2">
                {index > 0 ? <FlowArrow label={flow?.label} /> : null}
                <FlowNode
                  accent={module.accent}
                  active={activeNodeId === node.id}
                  index={index}
                  node={node}
                  onClick={onNodeSelect ? () => onNodeSelect(node) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="logic-pipeline space-y-2">
      {ordered.map((node, index) => {
        const flow = module.flows.find((f) => f.from === ordered[index - 1]?.id && f.to === node.id);
        return (
          <div key={node.id}>
            {index > 0 ? <FlowArrow label={flow?.label} vertical /> : null}
            <FlowNode
              accent={module.accent}
              active={activeNodeId === node.id}
              index={index}
              node={node}
              onClick={onNodeSelect ? () => onNodeSelect(node) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function orderNodes(nodes: LogicNode[], flows: LogicFlow[]): LogicNode[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => !flows.some((f) => f.to === n.id));
  const ordered: LogicNode[] = [];
  const visited = new Set<string>();
  const queue = roots.map((r) => r.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = idToNode.get(id);
    if (node) ordered.push(node);
    for (const flow of flows) {
      if (flow.from === id && !visited.has(flow.to)) queue.push(flow.to);
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) ordered.push(node);
  }

  return ordered;
}

export function LogicModuleCard({
  module,
  selected,
  pipelineComplete,
  onSelect,
}: {
  module: LogicModule;
  selected?: boolean;
  pipelineComplete?: boolean;
  onSelect: () => void;
}) {
  const colors = accentMap[module.accent];

  return (
    <motion.button
      className={cn(
        "glass w-full min-h-[220px] rounded-3xl p-6 text-left transition-all duration-300",
        selected ? `${colors.border} border-2 shadow-lg ${colors.glow}` : "border border-stone-200 hover:border-gold/30",
      )}
      type="button"
      whileHover={{ scale: 1.01 }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.35em]", colors.text)}>{module.subtitle}</p>
          <h3 className="mt-2 text-xl font-bold text-ink">{module.title}</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">{module.purpose}</p>
        </div>
        <div className={cn("shrink-0 rounded-2xl p-3", colors.bg)}>
          <Wallet className={cn("h-5 w-5", colors.text)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pipelineComplete ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </span>
        ) : null}
        {module.metrics.map((m) => (
          <span key={m.label} className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs text-stone-700">
            <span className="text-stone-500">{m.label}:</span> {m.value}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
