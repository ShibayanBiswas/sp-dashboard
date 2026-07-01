import type { ProductCategory } from "@/lib/types";

export type DashboardLane = "primary";

export interface CategoryDashboardConfig {
  category: ProductCategory;
  lane: DashboardLane;
  valuationLabel: string;
  payoffLabel: string;
}

const CONFIG: Record<ProductCategory, CategoryDashboardConfig> = {
  Primary: {
    category: "Primary",
    lane: "primary",
    valuationLabel: "Primary Valuation",
    payoffLabel: "Primary Payoff Analysis",
  },
};

export function getCategoryDashboardConfig(category: ProductCategory) {
  return CONFIG[category];
}

export function getAllCategoryDashboardConfigs() {
  return Object.values(CONFIG);
}
