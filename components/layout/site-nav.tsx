"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Upload } from "lucide-react";

import { CommandPalette } from "@/components/layout/command-palette";
import { MarketStrip } from "@/components/layout/market-strip";
import { mainSections, resolveNavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const pathname = usePathname();
  const section = resolveNavSection(pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="border-t border-white/5">
        <MarketStrip />
        <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-4 py-2 lg:px-6">
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1">
            {mainSections.map((item) => {
              const active = section.id === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    active ? "btn-nav-active text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                  )}
                  href={item.href as Route}
                >
                  {active ? (
                    <motion.span
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/25 to-purple-500/25 shadow-lg shadow-cyan-500/10"
                      layoutId="main-nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <Icon className="relative h-4 w-4" />
                  <span className="relative hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-ghost btn-animated inline-flex items-center gap-2 text-xs"
              type="button"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                ⌘K
              </kbd>
            </button>
            <Link className="btn-ghost btn-animated inline-flex items-center gap-2 text-xs" href="/upload">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Upload</span>
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {section.subNav?.length ? (
            <motion.div
              key={section.id}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-white/5 bg-slate-950/50"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: -4 }}
            >
              <div className="mx-auto flex max-w-full flex-wrap items-center gap-1 px-4 py-2 lg:px-6">
                {section.subNav.map((item) => {
                  const active = item.match ? item.match(pathname) : pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      className={cn(
                        "nav-sub-pill",
                        active && "nav-sub-pill-active",
                      )}
                      href={item.href as Route}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
