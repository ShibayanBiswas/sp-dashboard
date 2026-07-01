"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Calculator,
  ChevronDown,
  Cpu,
  Info,
  LineChart,
  Package,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { DeskFooter } from "@/components/layout/desk-footer";
import { SiteNav } from "@/components/layout/site-nav";
import { cn } from "@/lib/utils";

export function AppPage({
  children,
  actions,
  dense,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-mesh font-serif">
      <header className="brand-header sticky top-0 z-50 font-ui">
        <div className="brand-header-glow" />
        <div className="relative mx-auto flex max-w-full items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLogo />
            <div className="min-w-0 border-l border-stone-200 pl-4">
              <h1 className="brand-title">SP Dashboard</h1>
            </div>
          </div>
          {actions}
        </div>
        <SiteNav />
      </header>
      <motion.main
        animate={{ opacity: 1 }}
        className={cn("relative z-10 mx-auto w-full max-w-full flex-1 px-4 lg:px-6", dense ? "py-3" : "py-5")}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>
      <DeskFooter />
    </div>
  );
}

export function Panel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "purple";
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass rounded-xl border border-stone-200 p-4",
        glow === "cyan" && "glass-glow-cyan",
        glow === "purple" && "glass-glow-purple",
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <h2 className="font-ui flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
      {Icon ? <Icon className="h-5 w-5 text-gold" /> : null}
      {children}
    </h2>
  );
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold-dark/80">{children}</p>;
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

/** One parameter per full-width horizontal row (label left, control right). */
export function FieldStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

/** Collapsible, animated "what is this?" description panel for any section. */
export function SectionInfo({ title = "What is this?", paragraphs }: { title?: string; paragraphs: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-r from-gold/10 to-maroon/5">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-stone-100"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-dark/90">
          <Info className="h-3.5 w-3.5" />
          {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-4 w-4 text-gold-dark/70" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="space-y-3 border-t border-gold/20 px-4 py-3.5">
              {paragraphs.map((para, index) => (
                <motion.p
                  key={index}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm leading-relaxed text-stone-700"
                  initial={{ opacity: 0, y: 6 }}
                  transition={{ delay: 0.08 + index * 0.08, duration: 0.3 }}
                >
                  {para}
                </motion.p>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** In-page subpage navigation (horizontal pill tabs). */
export function SubPageTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-100 p-1.5">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            className={cn(
              "relative flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              isActive ? "text-maroon" : "text-stone-600 hover:bg-white hover:text-ink",
            )}
            type="button"
            onClick={() => onSelect(tab.id)}
          >
            {isActive ? (
              <motion.span
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold/30 to-gold/10 shadow-sm"
                layoutId="subpage-tab-active"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FieldRow({
  label,
  hint,
  children,
  wide,
}: {
  label: ReactNode;
  hint?: { title: string; paragraphs: string[] };
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", wide ? "md:grid-cols-[260px_1fr]" : "md:grid-cols-[200px_1fr]")}>
      <div className="flex items-start gap-2 pt-2.5">
        <label className="label-chip">{label}</label>
        {hint ? <FieldHint {...hint} /> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function FieldHint({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label={`About ${title}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-white text-gold-dark transition hover:border-gold hover:text-maroon"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="field-hint-popover absolute left-0 top-8 z-50 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -4 }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gold-dark">{title}</p>
            <div className="mt-2 space-y-2">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-xs leading-5 text-stone-700">
                  {p}
                </p>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function InputGlow(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input-glow w-full rounded-2xl px-4 py-3 text-sm outline-none", props.className)} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <InputGlow {...props} />;
}

export function SelectGlow(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "input-glow w-full cursor-pointer appearance-none rounded-2xl px-4 py-3 text-sm outline-none",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <SelectGlow {...props} />;
}

export function OutputGlow({
  children,
  className,
  accent = "cyan",
}: {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "purple" | "green";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm font-bold",
        accent === "cyan" && "output-glow-cyan",
        accent === "purple" && "output-glow-purple",
        accent === "green" && "output-glow-green",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Output({ children, className }: { children: ReactNode; className?: string }) {
  return <OutputGlow className={className}>{children}</OutputGlow>;
}

export function Button({
  variant = "ghost",
  active,
  children,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "accent" | "pill";
  active?: boolean;
}) {
  const showShine = false;

  return (
    <button
      {...props}
      className={cn(
        "btn-animated",
        variant === "primary" && "btn-primary",
        variant === "accent" && "btn-accent",
        variant === "ghost" && "btn-ghost",
        variant === "pill" && (active ? "btn-pill btn-pill-active" : "btn-pill"),
        props.disabled && "pointer-events-none opacity-40",
        className,
      )}
      type={type}
    >
      {showShine ? <span className="btn-shine" aria-hidden /> : null}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
      <table className="data-table w-full text-sm">{children}</table>
    </div>
  );
}

const kpiIcons: Record<string, LucideIcon> = {
  "Product Value": Wallet,
  "Current Value": Wallet,
  Ongoing: LineChart,
  "Abs. Return": BarChart3,
  "Product IRR": LineChart,
  IRR: LineChart,
  "Live Notional": Wallet,
  Products: Package,
  "Avg Coupon": Calculator,
  "Expiring in 3M": LineChart,
  "Expiring in 1M": LineChart,
  Active: LineChart,
  Expired: LineChart,
  "Logic Modules": Brain,
  "Pipeline Stages": Cpu,
  Primitives: Zap,
};

export function KpiBand({
  items,
  accents = ["cyan", "purple", "green"],
}: {
  items: Array<{ label: string; value: string }>;
  accents?: Array<"cyan" | "purple" | "green" | "amber" | "rose">;
}) {
  const colors = { cyan: "#a8821f", purple: "#7a1e2c", green: "#15803d", amber: "#b45309", rose: "#be123c" };

  return (
    <div
      className={cn(
        "grid gap-4",
        items.length >= 5 ? "md:grid-cols-2 xl:grid-cols-5" : items.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3",
      )}
    >
      {items.map((item, index) => {
        const accent = accents[index % accents.length] ?? "cyan";
        const Icon = kpiIcons[item.label] ?? Calculator;
        return (
          <motion.div
            key={item.label}
            animate={{ opacity: 1, y: 0 }}
            className="kpi-card"
            initial={{ opacity: 0, y: 16 }}
            style={{ "--kpi-accent": colors[accent] } as React.CSSProperties}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">{item.label}</p>
              <div
                className="rounded-xl p-2"
                style={{ backgroundColor: `${colors[accent]}20`, color: colors[accent] }}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 bg-gradient-to-r from-maroon to-gold-dark bg-clip-text text-3xl font-black tracking-tight text-transparent">
              {item.value}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ChartPanel({
  title,
  subtitle,
  children,
  glow,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  glow?: "cyan" | "purple";
  icon?: "chart";
  className?: string;
}) {
  return (
    <Panel glow={glow} className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle icon={icon === "chart" ? BarChart3 : undefined}>{title.toUpperCase()}</SectionTitle>
          {subtitle ? <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-dark">
          Live chart
        </span>
      </div>
      <div className="chart-panel-body mt-5">{children}</div>
    </Panel>
  );
}
