"use client";

import { useMemo, useState } from "react";

import { LifecycleAnalyticsGrid } from "@/components/analytics/lifecycle-lab";
import { ScienceLab } from "@/components/analytics/science-lab";
import { LifecycleProductList } from "@/components/dashboard/lifecycle-product-list";
import { AppPage, KpiBand } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { useDataset } from "@/lib/context/dataset-provider";
import { useMasterProducts } from "@/lib/hooks/use-master-products";
import { usePortfolioClock } from "@/lib/hooks/use-portfolio-clock";
import type { LifecycleFilter } from "@/lib/product-lifecycle";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function PortfolioAnalyticsPage() {
  const { dataset } = useDataset();
  const masterProducts = useMasterProducts();
  const { asOf } = usePortfolioClock();
  const stats = useMemo(
    () => getPortfolioHeadlineStats({ ...dataset, products: masterProducts }, asOf),
    [dataset, masterProducts, asOf],
  );
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("ongoing");

  return (
    <AppPage dense title="Analytics Lab">
      <KpiBand
        accents={["cyan", "green", "purple", "amber", "rose"]}
        items={[
          { label: "Live Notional", value: formatCurrency(stats.liveNotional) },
          { label: "Ongoing", value: formatNumber(stats.ongoingCount) },
          { label: "Expiring in 3M", value: formatNumber(stats.maturingSoon) },
          { label: "Expiring in 1M", value: formatNumber(stats.expiring1m) },
          { label: "Expired", value: formatNumber(stats.expiredCount) },
        ]}
      />
      <div className="mt-6 space-y-4">
        <HorizontalBand>
          <LifecycleProductList
            filter={lifecycle}
            products={masterProducts}
            onFilterChange={setLifecycle}
          />
        </HorizontalBand>
        <LifecycleAnalyticsGrid filter={lifecycle} products={masterProducts} />
        <ScienceLab filter={lifecycle} products={masterProducts} />
      </div>
    </AppPage>
  );
}
