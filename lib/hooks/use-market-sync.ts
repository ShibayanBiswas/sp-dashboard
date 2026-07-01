"use client";

import { useCallback, useEffect, useState } from "react";

import type { MarketLevels } from "@/lib/market-data";
import { deskDateKey } from "@/lib/market-data";

export function useMarketSync(onSync: (levels: MarketLevels) => void) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [levels, setLevels] = useState<MarketLevels | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/market/levels", { cache: "no-store" });
      if (!res.ok) throw new Error("market fetch failed");
      const data = (await res.json()) as MarketLevels;
      setLevels(data);
      onSync(data);
      setStatus("ready");
      return data;
    } catch {
      setStatus("error");
      return null;
    }
  }, [onSync]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onDayChange = () => void refresh();
    const check = window.setInterval(() => {
      if (levels && deskDateKey() !== deskDateKey(new Date(levels.fetchedAt))) {
        void refresh();
      }
    }, 60_000);
    document.addEventListener("visibilitychange", onDayChange);
    return () => {
      window.clearInterval(check);
      document.removeEventListener("visibilitychange", onDayChange);
    };
  }, [levels, refresh]);

  return { status, levels, refresh };
}
