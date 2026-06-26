"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Database, Cpu, Search, LineChart, Wallet, Zap } from "lucide-react";

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
  cyan: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-300", glow: "shadow-cyan-500/20" },
  purple: { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-300", glow: "shadow-purple-500/20" },
  green: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-300", glow: "shadow-emerald-500/20" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300", glow: "shadow-amber-500/20" },
  rose: { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-300", glow: "shadow-rose-500/20" },
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
        active && `ring-2 ring-offset-2 ring-offset-slate-950 ${colors.border}`,
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
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{node.kind}</p>
          <p className="mt-1 font-semibold text-white">{node.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{node.description}</p>
        </div>
      </div>
    </motion.button>
  );
}

function FlowArrow({ label, vertical }: { label?: string; vertical?: boolean }) {
  const Icon = vertical ? ArrowDown : ArrowRight;
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-1">
      <Icon className="h-4 w-4 text-cyan-500/60" />
      {label ? <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/70">{label}</span> : null}
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
              <div key={node.id} className="flex min-w-[240px] max-w-[280px] snap-start items-center gap-2">
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
  const targets = new Set(flows.map((f) => f.to));
  const roots = nodes.filter((n) => !targets.has(n.id));
  const start = roots[0] ?? nodes[0];
  if (!start) return nodes;

  const ordered: LogicNode[] = [];
  const visited = new Set<string>();
  let current: LogicNode | undefined = start;

  while (current && !visited.has(current.id)) {
    ordered.push(current);
    visited.add(current.id);
    const nextFlow = flows.find((f) => f.from === current!.id);
    current = nextFlow ? idToNode.get(nextFlow.to) : undefined;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) ordered.push(node);
  }

  return ordered;
}

export function LogicModuleCard({
  module,
  selected,
  onSelect,
}: {
  module: LogicModule;
  selected?: boolean;
  onSelect: () => void;
}) {
  const colors = accentMap[module.accent];

  return (
    <motion.button
      className={cn(
        "glass w-full rounded-3xl p-6 text-left transition-all duration-300",
        selected ? `${colors.border} border-2 shadow-lg ${colors.glow}` : "border border-white/10 hover:border-white/20",
      )}
      type="button"
      whileHover={{ scale: 1.01 }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.35em]", colors.text)}>{module.subtitle}</p>
          <h3 className="mt-2 text-xl font-bold text-white">{module.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{module.purpose.slice(0, 140)}…</p>
        </div>
        <div className={cn("rounded-2xl p-3", colors.bg)}>
          <Wallet className={cn("h-5 w-5", colors.text)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {module.metrics.map((m) => (
          <span key={m.label} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300">
            <span className="text-slate-500">{m.label}:</span> {m.value}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
