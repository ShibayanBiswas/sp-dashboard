"use client";

import { useMemo } from "react";

import { ScienceLab } from "@/components/analytics/science-lab";
import { LifecycleAnalyticsGrid } from "@/components/analytics/lifecycle-lab";
import { LifecycleProductList } from "@/components/dashboard/lifecycle-product-list";
import { AppPage, KpiBand } from "@/components/layout/app-ui";
import { HorizontalBand } from "@/components/layout/horizontal-rail";
import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { useDataset } from "@/lib/context/dataset-provider";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function PortfolioAnalyticsPage() {
  const { dataset } = useDataset();
  const stats = useMemo(() => getPortfolioHeadlineStats(dataset), [dataset]);

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
          <LifecycleProductList products={dataset.products} />
        </HorizontalBand>
        <ScienceLab products={dataset.products} />
        <LifecycleAnalyticsGrid products={dataset.products} />
      </div>
    </AppPage>
  );
}
