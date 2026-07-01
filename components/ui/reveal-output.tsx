"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function RevealOutput({
  children,
  label = "Click here to reveal output",
  className,
  resetKey,
  footer,
  onReveal,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  /** When this value changes, the panel collapses until clicked again. */
  resetKey?: string | number;
  /** Optional download action shown once output is revealed. */
  footer?: ReactNode;
  /** Fires once when the user opens the output panel (e.g. data-quality alerts). */
  onReveal?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [resetKey]);

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="reveal-closed"
            animate={{ opacity: 1, y: 0 }}
            className="btn-reveal group w-full"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            type="button"
            onClick={() => {
              onReveal?.();
              setOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4 text-gold-dark/80 transition group-hover:text-gold-dark" />
            <span>{label}</span>
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </motion.button>
        ) : (
          <motion.div
            key="reveal-open"
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {children}
            {footer ? <div className="flex justify-end border-t border-stone-200 pt-4">{footer}</div> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
