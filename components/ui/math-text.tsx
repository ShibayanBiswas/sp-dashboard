"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** LaTeX-inspired math typography for desk symbols. */
export function MathText({
  children,
  className,
  block,
}: {
  children: ReactNode;
  className?: string;
  block?: boolean;
}) {
  return (
    <span
      className={cn(
        "math-serif font-serif tracking-tight text-gold-dark/95",
        block && "block",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MathZ({ className }: { className?: string }) {
  return (
    <MathText className={cn("italic text-maroon", className)}>
      <em className="not-italic font-serif italic">Z</em>
    </MathText>
  );
}

export function MathFormula({ expr, className }: { expr: string; className?: string }) {
  const parts = expr.split(/(\bZ\b)/g);
  return (
    <span className={cn("math-serif text-sm leading-relaxed text-stone-700", className)}>
      {parts.map((part, i) =>
        part === "Z" ? (
          <MathZ key={i} className="mx-0.5 inline" />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
