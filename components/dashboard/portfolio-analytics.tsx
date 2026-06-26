"use client";

import { useMemo } from "react";

import { ScienceLab } from "@/components/analytics/science-lab";
import { AppPage, KpiBand } from "@/components/layout/app-ui";
import { getPortfolioHeadlineStats } from "@/lib/analytics";
import { useDataset } from "@/lib/context/dataset-provider";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function PortfolioAnalyticsPage() {
  const { dataset } = useDataset();
  const stats = useMemo(() => getPortfolioHeadlineStats(dataset), [dataset]);

  return (
    <AppPage
      subtitle="Lifecycle, coupon, protection, tenor, and scatter analytics — full scientific lab."
      title="Analytics Lab"
    >
      <KpiBand
        accents={["cyan", "green", "purple", "amber"]}
        items={[
          { label: "Live Notional", value: formatCurrency(stats.liveNotional) },
          { label: "Active", value: formatNumber(stats.activeCount) },
          { label: "Expired", value: formatNumber(stats.expiredCount) },
          { label: "Maturing in 90d", value: formatNumber(stats.maturingSoon) },
        ]}
      />
      <div className="mt-8">
        <ScienceLab products={dataset.products} />
      </div>
    </AppPage>
  );
}
