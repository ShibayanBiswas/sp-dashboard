"use client";

import { useMemo } from "react";

import { useDataset } from "@/lib/context/dataset-provider";
import { filterValidMasterProducts } from "@/lib/product-lifecycle";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";

/** Primary master products with valid lifecycle + notional — excludes unknown / NaN rows. */
export function useMasterProducts() {
  const { dataset } = useDataset();
  const { asOf } = usePortfolioClock();
  return useMemo(() => filterValidMasterProducts(dataset.products, asOf), [dataset.products, asOf]);
}
