"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { resolveProduct } from "@/lib/product-utils";
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
  valuationDate: "31-May-26",
  currentLevel: "",
  niftyLevel: "23547.75",
  sensexLevel: "74775.74",
  debentures: "100",
  purchaseDate: "31-May-26",
  pricePerDebenture: "",
};

type ProductSelectionContextValue = ProductSelectionState & {
  resolvedProduct: ProductRecord | undefined;
  setField: <K extends keyof ProductSelectionState>(key: K, value: ProductSelectionState[K]) => void;
  selectProduct: (product: ProductRecord) => void;
  setCategory: (category: ProductCategory | undefined) => void;
};

const ProductSelectionContext = createContext<ProductSelectionContextValue | null>(null);

export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const { dataset } = useDataset();
  const [state, setState] = useState<ProductSelectionState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setState({ ...DEFAULT_STATE, ...(JSON.parse(cached) as ProductSelectionState) });
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
    if (!hydrated) {
      return;
    }
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
      setField(key, value) {
        setState((current) => ({ ...current, [key]: value }));
      },
      selectProduct(product) {
        setState((current) => ({
          ...current,
          productName: product.name,
          isin: product.isin ?? "",
          productCode: product.series ?? "",
          category: product.category,
        }));
      },
      setCategory(category) {
        setState((current) => ({ ...current, category }));
      },
    }),
    [resolvedProduct, state],
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
