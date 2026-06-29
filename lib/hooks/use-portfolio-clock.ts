"use client";

import { useEffect, useState } from "react";

import { deskDateKey } from "@/lib/market-data";

/**
 * Live portfolio clock — re-evaluates lifecycle buckets against system date/time.
 * Updates every minute so AUM / counts refresh through the day without reload.
 */
export function usePortfolioClock() {
  const [asOf, setAsOf] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setAsOf(new Date());
    const id = window.setInterval(tick, 60_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { asOf, dayKey: deskDateKey(asOf) };
}
