"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** Full-width single card row — one card per horizontal band. */
export function HorizontalBand({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full", className)}
      id={id}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.section>
  );
}

/** Horizontally scrollable rail with snap — for logic modules, flowcharts, etc. */
export function HorizontalRail({
  children,
  className,
  gap = "gap-4",
}: {
  children: ReactNode;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={cn("horizontal-rail -mx-1 overflow-x-auto px-1 pb-2", className)}>
      <div className={cn("flex min-w-min snap-x snap-mandatory", gap)}>{children}</div>
    </div>
  );
}

export function RailCard({
  children,
  className,
  minWidth = "min-w-[85vw] md:min-w-[70vw] lg:min-w-[55vw] xl:min-w-[45vw]",
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={cn("rail-card snap-start", minWidth, className)}>
      {children}
    </div>
  );
}
