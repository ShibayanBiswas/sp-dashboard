"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function RevealOutput({
  children,
  label = "Click here to reveal output",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

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
            onClick={() => setOpen(true)}
          >
            <Sparkles className="h-4 w-4 text-cyan-300/80 transition group-hover:text-cyan-200" />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
