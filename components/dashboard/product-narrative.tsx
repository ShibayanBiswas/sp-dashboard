"use client";

import { motion } from "framer-motion";

import type { ProductRecord } from "@/lib/types";
import { getProductOverview, parseExplanationBlocks } from "@/lib/product-narrative";
import { getCouponLabel } from "@/lib/product-utils";
import { categoryNeon } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";

export function ProductNarrative({
  product,
  className,
}: {
  product: ProductRecord;
  className?: string;
}) {
  const overview = getProductOverview(product);
  const blocks = parseExplanationBlocks(overview.explanation);
  const couponLabel = getCouponLabel(product);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`product-narrative-card ${className ?? ""}`}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-amber-900/90">
            Product Overview
          </p>
          <h3 className="font-serif text-xl font-bold italic text-ink">{overview.title}</h3>
          {overview.issuer ? (
            <p className="mt-1 font-serif text-sm text-stone-600">
              <span className="font-bold text-stone-700">Issuer:</span>{" "}
              <em>{overview.issuer}</em>
              {overview.isin ? (
                <>
                  {" "}
                  · <span className="font-bold text-stone-700">ISIN:</span> <em>{overview.isin}</em>
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
        <div className="mt-4 space-y-3 font-serif text-[15px] leading-7 text-stone-800">
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
                <p key={i} className="font-bold text-maroon">
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
        <p className="mt-4 font-serif text-sm italic text-stone-500">
          Product description will appear once the master file includes an explanation for this structure.
        </p>
      )}

      {overview.structure.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {overview.structure.map((line) => (
            <div key={line} className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 font-serif text-sm">
              <span dangerouslySetInnerHTML={{ __html: emphasizeNarrative(line) }} />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-stone-200 pt-4 font-serif text-sm">
        {product.tradeAmount ? (
          <span>
            <strong className="text-gold-dark">Notional:</strong> <em>{formatCurrency(product.tradeAmount)}</em>
          </span>
        ) : null}
        {couponLabel ? (
          <span>
            <strong className="text-maroon">Coupon:</strong> <em>{couponLabel}</em>
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Bold key financial terms; italicize percentages and levels in prose. */
function emphasizeNarrative(text: string) {
  return text
    .replace(/(\d+(\.\d+)?%)/g, "<em class='text-amber-900'>$1</em>")
    .replace(
      /\b(Principal|Coupon|Nifty|Sensex|Capital|Protected|Participation|Final Fixing|Initial Level|Target Level|Maturity)\b/gi,
      "<strong>$1</strong>",
    );
}
