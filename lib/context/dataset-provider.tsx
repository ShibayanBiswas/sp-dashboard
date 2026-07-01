"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { demoDataset } from "@/lib/demo-data";
import { ACTIVE_CATEGORIES, type DashboardDataset } from "@/lib/types";
import { parseWorkbookFile } from "@/lib/workbook/parser";

const STORAGE_KEY = "sp-dashboard-dataset-v3";

/**
 * Restrict a parsed dataset to the categories that are currently live in the UI
 * (see ACTIVE_CATEGORIES). The dashboard is Primary-only today; this keeps the
 * pipeline defensive if a future master file carries extra sheets.
 */
function restrictToActiveCategories(dataset: DashboardDataset): DashboardDataset {
  const active = new Set(ACTIVE_CATEGORIES);
  return {
    ...dataset,
    products: dataset.products.filter((product) => active.has(product.category)),
    categorySummaries: dataset.categorySummaries.filter((summary) => active.has(summary.category)),
    formulaCatalog: dataset.formulaCatalog.filter(
      (entry) => !entry.category || active.has(entry.category),
    ),
  };
}

type DatasetContextValue = {
  dataset: DashboardDataset;
  uploadState: string;
  isLoading: boolean;
  uploadWorkbook: (file: File) => Promise<void>;
  resetToDemo: () => void;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<DashboardDataset>(() => restrictToActiveCategories(demoDataset));
  const [uploadState, setUploadState] = useState("Upload the New Product Master file to load live Primary structured-product data.");
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          setDataset(restrictToActiveCategories(JSON.parse(cached) as DashboardDataset));
          setUploadState("Restored the last uploaded master file from this browser.");
          return;
        }

        setIsLoading(true);
        setUploadState("Loading New Product Master from project...");
        const response = await fetch("/api/parse/bootstrap");
        if (!response.ok) {
          setUploadState("Upload the New Product Master file to load live Primary structured-product data.");
          return;
        }
        const parsedRaw = (await response.json()) as DashboardDataset;
        if (cancelled) return;
        const parsed = restrictToActiveCategories(parsedRaw);
        setDataset(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedRaw));
        const stats = getPortfolioHeadlineStats(parsed);
        setUploadState(
          `Loaded ${parsed.workbookName}: ${parsed.products.length} Primary products · Active ${stats.activeCount} · Expired ${stats.expiredCount}.`,
        );
      } catch {
        if (!cancelled) {
          setUploadState("Upload the New Product Master file to load live Primary structured-product data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHydrated(true);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DatasetContextValue>(
    () => ({
      dataset,
      uploadState,
      isLoading,
      async uploadWorkbook(file: File) {
        setIsLoading(true);
        setUploadState(`Parsing ${file.name}...`);
        try {
          const parsedRaw = await parseWorkbookFile(file);
          const parsed = restrictToActiveCategories(parsedRaw);
          setDataset(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedRaw));
          setUploadState(`Loaded ${file.name} successfully. ${parsed.products.length} Primary products indexed.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown parsing error";
          setUploadState(`Upload failed: ${message}`);
        } finally {
          setIsLoading(false);
        }
      },
      resetToDemo() {
        setDataset(restrictToActiveCategories(demoDataset));
        localStorage.removeItem(STORAGE_KEY);
        setUploadState("Demo snapshot restored.");
      },
    }),
    [dataset, isLoading, uploadState],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used within DatasetProvider");
  }
  return context;
}
