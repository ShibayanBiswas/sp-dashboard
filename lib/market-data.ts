const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Desk date format — e.g. 28-Jun-26 (matches valuation workbook). */
export function formatDeskDate(date: Date = new Date()) {
  return `${date.getDate()}-${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

export function deskDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export interface MarketLevels {
  valuationDate: string;
  niftyLevel: number;
  sensexLevel: number;
  fetchedAt: string;
  source: "yahoo" | "fallback";
}

const FALLBACK: Omit<MarketLevels, "fetchedAt"> = {
  valuationDate: formatDeskDate(new Date("2026-05-31")),
  niftyLevel: 23547.75,
  sensexLevel: 74775.74,
  source: "fallback",
};

async function fetchYahooLastPrice(symbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SP-Dashboard/1.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
  };
  const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
  return price != null && Number.isFinite(price) ? price : null;
}

/** Live Nifty 50 (^NSEI) and BSE Sensex (^BSESN) from Yahoo Finance. */
export async function fetchLiveMarketLevels(): Promise<MarketLevels> {
  const now = new Date();
  try {
    const [nifty, sensex] = await Promise.all([fetchYahooLastPrice("^NSEI"), fetchYahooLastPrice("^BSESN")]);
    if (nifty != null && sensex != null) {
      return {
        valuationDate: formatDeskDate(now),
        niftyLevel: Math.round(nifty * 100) / 100,
        sensexLevel: Math.round(sensex * 100) / 100,
        fetchedAt: now.toISOString(),
        source: "yahoo",
      };
    }
  } catch {
    /* use fallback */
  }
  return {
    ...FALLBACK,
    valuationDate: formatDeskDate(now),
    fetchedAt: now.toISOString(),
  };
}
