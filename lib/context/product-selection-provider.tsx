"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DESK_DEFAULTS } from "@/lib/desk-defaults";
import { useMarketSync } from "@/lib/hooks/use-market-sync";
import type { MarketLevels } from "@/lib/market-data";
import { resolveProduct, getDebenturePrice, getIndexEntryLevel, inferDebentureCount, rawField, resolveLiveIndexLevel } from "@/lib/product-utils";
import { useDataset } from "@/lib/context/dataset-provider";
import type { ProductCategory, ProductRecord } from "@/lib/types";

const STORAGE_KEY = "sp-dashboard-product-selection-v2";

export interface ProductSelectionState {
  isin: string;
  productCode: string;
  productName: string;
  category?: ProductCategory;
  valuationDate: string;
  currentLevel: string;
  niftyLevel: string;
  sensexLevel: string;
  debentures: string;
  purchaseDate: string;
  pricePerDebenture: string;
}

/**
 * Defaults mirror the Primary Valuation workbook as on the 31-May-26 reference
 * date (Valuation!H14 = 46173). Val-date Nifty (H16) = 23547.75 and val-date
 * Sensex (H17) = 74775.74. The Working sheet picks the relevant index per the
 * product underlying: M = IF(A="Nifty", D1 [Nifty level], C1 [Sensex level]).
 */
const DEFAULT_STATE: ProductSelectionState = {
  isin: "",
  productCode: "",
  productName: "",
  valuationDate: DESK_DEFAULTS.valuationDate,
  currentLevel: "",
  niftyLevel: DESK_DEFAULTS.niftyLevel,
  sensexLevel: DESK_DEFAULTS.sensexLevel,
  debentures: DESK_DEFAULTS.debentures,
  purchaseDate: "",
  pricePerDebenture: "",
};

type ProductSelectionContextValue = ProductSelectionState & {
  resolvedProduct: ProductRecord | undefined;
  marketStatus: "idle" | "loading" | "ready" | "error";
  marketLevels: MarketLevels | null;
  refreshMarket: () => Promise<MarketLevels | null>;
  setField: <K extends keyof ProductSelectionState>(key: K, value: ProductSelectionState[K]) => void;
  selectProduct: (product: ProductRecord) => void;
  setCategory: (category: ProductCategory | undefined) => void;
};

const ProductSelectionContext = createContext<ProductSelectionContextValue | null>(null);

export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const { dataset } = useDataset();
  const [state, setState] = useState<ProductSelectionState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  const applyMarket = useCallback((levels: MarketLevels) => {
    setState((current) => ({
      ...current,
      valuationDate: levels.valuationDate,
      niftyLevel: String(levels.niftyLevel),
      sensexLevel: String(levels.sensexLevel),
    }));
  }, []);

  const { status: marketStatus, levels: marketLevels, refresh: refreshMarket } = useMarketSync(applyMarket);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as ProductSelectionState;
        setState({
          ...DEFAULT_STATE,
          isin: parsed.isin,
          productCode: parsed.productCode,
          productName: parsed.productName,
          category: parsed.category,
          debentures: parsed.debentures,
          purchaseDate: parsed.purchaseDate,
          pricePerDebenture: parsed.pricePerDebenture,
        });
      } else if (dataset.products[0]) {
        setState((current) => ({ ...current, productName: dataset.products[0].name }));
      }
    } catch {
      if (dataset.products[0]) {
        setState((current) => ({ ...current, productName: dataset.products[0].name }));
      }
    } finally {
      setHydrated(true);
    }
  }, [dataset.products]);

  useEffect(() => {
    if (!hydrated || !marketLevels) return;
    setState((current) => {
      const product = resolveProduct(dataset.products, {
        isin: current.isin,
        productCode: current.productCode,
        productName: current.productName,
        category: current.category,
      });
      const liveLevel = product
        ? resolveLiveIndexLevel(product, {
            niftyLevel: Number(current.niftyLevel) || marketLevels.niftyLevel,
            sensexLevel: Number(current.sensexLevel) || marketLevels.sensexLevel,
          })
        : 0;
      return {
        ...current,
        currentLevel: liveLevel > 0 ? String(liveLevel) : current.currentLevel,
      };
    });
  }, [hydrated, marketLevels, dataset.products]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const resolvedProduct = useMemo(
    () =>
      resolveProduct(dataset.products, {
        isin: state.isin,
        productCode: state.productCode,
        productName: state.productName,
        category: state.category,
      }),
    [dataset.products, state.category, state.isin, state.productCode, state.productName],
  );

  const value = useMemo<ProductSelectionContextValue>(
    () => ({
      ...state,
      resolvedProduct,
      marketStatus,
      marketLevels,
      refreshMarket,
      setField(key, value) {
        setState((current) => ({ ...current, [key]: value }));
      },
      selectProduct(product) {
        setState((current) => {
          const indexEntry = getIndexEntryLevel(product);
          const price = getDebenturePrice(product);
          const tradeDate = rawField(product, "Trade Date/Opening date", "Trade Date", "Allotment Date") ?? "";
          const liveLevel = resolveLiveIndexLevel(product, {
            niftyLevel: Number(current.niftyLevel) || undefined,
            sensexLevel: Number(current.sensexLevel) || undefined,
          });
          return {
            ...current,
            productName: product.name,
            isin: product.isin ?? "",
            productCode: product.series ?? "",
            category: product.category,
            currentLevel: liveLevel > 0 ? String(liveLevel) : String(indexEntry),
            purchaseDate: tradeDate || current.purchaseDate,
            pricePerDebenture: price ? String(price) : current.pricePerDebenture,
            debentures: String(inferDebentureCount(product)),
          };
        });
      },
      setCategory(category) {
        setState((current) => ({ ...current, category }));
      },
    }),
    [resolvedProduct, state, marketStatus, marketLevels, refreshMarket],
  );

  return <ProductSelectionContext.Provider value={value}>{children}</ProductSelectionContext.Provider>;
}

export function useProductSelection() {
  const context = useContext(ProductSelectionContext);
  if (!context) {
    throw new Error("useProductSelection must be used within ProductSelectionProvider");
  }
  return context;
}
