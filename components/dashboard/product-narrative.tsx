"use client";

import { motion } from "framer-motion";

import type { ProductRecord } from "@/lib/types";
import { getProductOverview, parseExplanationBlocks } from "@/lib/product-narrative";
import { categoryNeon } from "@/lib/chart-theme";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function ProductNarrative({
  product,
  className,
}: {
  product: ProductRecord;
  className?: string;
}) {
  const overview = getProductOverview(product);
  const blocks = parseExplanationBlocks(overview.explanation);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`product-narrative-card ${className ?? ""}`}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
            Product Overview
          </p>
          <h3 className="font-serif text-xl font-bold italic text-white">{overview.title}</h3>
          {overview.issuer ? (
            <p className="mt-1 font-serif text-sm text-slate-400">
              <span className="font-bold text-slate-300">Issuer:</span>{" "}
              <em>{overview.issuer}</em>
              {overview.isin ? (
                <>
                  {" "}
                  · <span className="font-bold text-slate-300">ISIN:</span> <em>{overview.isin}</em>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <span
          className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            borderColor: `${categoryNeon[product.category]}50`,
            color: categoryNeon[product.category],
            backgroundColor: `${categoryNeon[product.category]}15`,
          }}
        >
          {product.category}
        </span>
      </div>

      {blocks.length > 0 ? (
        <div className="mt-4 space-y-3 font-serif text-[15px] leading-7 text-slate-200">
          {blocks.map((block, i) => {
            if (block.type === "point") {
              const match = block.content.match(/^(\d+[\.\)])\s*(.*)$/);
              const num = match?.[1] ?? "";
              const rest = match?.[2] ?? block.content;
              return (
                <motion.p
                  key={i}
                  animate={{ opacity: 1, x: 0 }}
                  className="pl-1"
                  initial={{ opacity: 0, x: -6 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <span className="font-bold text-amber-100">{num}</span>{" "}
                  <span dangerouslySetInnerHTML={{ __html: emphasizeNarrative(rest) }} />
                </motion.p>
              );
            }
            if (block.type === "heading") {
              return (
                <p key={i} className="font-bold text-cyan-100">
                  {block.content}
                </p>
              );
            }
            return (
              <p key={i} dangerouslySetInnerHTML={{ __html: emphasizeNarrative(block.content) }} />
            );
          })}
        </div>
      ) : (
        <p className="mt-4 font-serif text-sm italic text-slate-500">
          Product description will appear once the master file includes an explanation for this structure.
        </p>
      )}

      {overview.structure.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {overview.structure.map((line) => (
            <div key={line} className="rounded-xl border border-white/8 bg-black/25 px-3 py-2 font-serif text-sm">
              <span dangerouslySetInnerHTML={{ __html: emphasizeNarrative(line) }} />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-white/8 pt-4 font-serif text-sm">
        {product.tradeAmount ? (
          <span>
            <strong className="text-cyan-300">Notional:</strong> <em>{formatCurrency(product.tradeAmount)}</em>
          </span>
        ) : null}
        {product.couponPercent !== undefined ? (
          <span>
            <strong className="text-purple-300">Coupon:</strong> <em>{formatPercent(product.couponPercent)}</em>
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Bold key financial terms; italicize percentages and levels in prose. */
function emphasizeNarrative(text: string) {
  return text
    .replace(/(\d+(\.\d+)?%)/g, "<em class='text-amber-200'>$1</em>")
    .replace(
      /\b(Principal|Coupon|Nifty|Sensex|Capital|Protected|Participation|Final Fixing|Initial Level|Target Level|Maturity)\b/gi,
      "<strong>$1</strong>",
    );
}
