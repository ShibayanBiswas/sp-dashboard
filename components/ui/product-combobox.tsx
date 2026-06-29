"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Hash, Search, TrendingUp } from "lucide-react";

import type { ProductRecord } from "@/lib/types";
import { categoryNeon } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

interface MenuRect {
  left: number;
  top: number;
  width: number;
}

export function ProductCombobox({
  products,
  value,
  onSelect,
  placeholder = "Search product, ISIN, issuer, series...",
  open: controlledOpen,
  onOpenChange,
}: {
  products: ProductRecord[];
  value?: string;
  onSelect: (product: ProductRecord) => void;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<MenuRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const selected = products.find((p) => p.name === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const needle = query.toLowerCase();
    return products.filter((p) =>
      [p.name, p.isin, p.issuer, p.series, p.underlying, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [products, query]);

  // Anchor the portal menu to the trigger; track scroll/resize so it stays put.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const node = triggerRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom + 8, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-combobox-menu]")) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        className="input-glow btn-animated flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:border-cyan-400/40 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)]"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <Search className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <p className="truncate text-sm font-semibold text-ink">{selected.name}</p>
              <p className="truncate text-xs text-muted">
                {[selected.category, selected.isin, selected.issuer].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{placeholder}</p>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted transition", open && "rotate-180")} />
      </button>

      {mounted && rect
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  data-combobox-menu
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="dropdown-panel fixed z-[200] overflow-hidden"
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  style={{ left: rect.left, top: rect.top, width: rect.width }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="border-b border-white/10 p-3">
                    <div className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2">
                      <Search className="h-4 w-4 text-cyan-400" />
                      <input
                        autoFocus
                        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                        placeholder="Type ISIN, name, issuer..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
                      {filtered.length.toLocaleString("en-IN")} products
                    </p>
                  </div>
                  {filtered.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted">No products match “{query}”.</p>
                  ) : null}
                  <ul className="max-h-[min(50vh,420px)] overflow-y-auto">
                    {filtered.map((product) => (
                      <li key={product.rowId}>
                        <button
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-cyan-500/10 hover:pl-5"
                          type="button"
                          onClick={() => {
                            onSelect(product);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: categoryNeon[product.category] ?? "#22d3ee" }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                            <p className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
                              {product.isin ? (
                                <span className="inline-flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {product.isin}
                                </span>
                              ) : null}
                              {product.underlying ? (
                                <span className="inline-flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {product.underlying}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
