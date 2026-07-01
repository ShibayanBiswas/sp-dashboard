"use client";

import { useCallback } from "react";

import { formatDeskDate } from "@/lib/market-data";
import { parseExcelishDate } from "@/lib/workbook/dates";

export function useIndexAtDate() {
  const fetchIndexAtDate = useCallback(async (deskDate: string, minDeskDate?: string) => {
    const params = new URLSearchParams({ date: deskDate });
    if (minDeskDate) params.set("minDate", minDeskDate);
    const res = await fetch(`/api/market/index-at-date?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as {
      valuationDate: string;
      niftyLevel: number | null;
      sensexLevel: number | null;
      source: "mongodb" | "missing";
    };
  }, []);

  const fetchForIso = useCallback(
    async (iso: string) => {
      const parsed = parseExcelishDate(iso);
      if (!parsed) return null;
      return fetchIndexAtDate(formatDeskDate(parsed));
    },
    [fetchIndexAtDate],
  );

  return { fetchIndexAtDate, fetchForIso };
}
