import type { ProductCategory, ProductRecord } from "@/lib/types";
import { classifyProtection, getCouponPercent } from "@/lib/product-utils";

/**
 * Risk model grounded in "Document No 105 — Structured Products Issuer Selection".
 *
 * Key principles from the document:
 *  - The dominant risk in a structured product is the ISSUER'S CREDIT RISK
 *    (NBFC default risk), not market direction. ARWL runs a 7-step credit
 *    screen (CAR, Gross NPA, PAT, Current Ratio, Investment/Total-Assets, Z2)
 *    and only credible issuers (ARGFL etc.) qualify.
 *  - SPs are deliberately structured as NON-principal-protected with PARTIAL
 *    protection; a 24-year back-test shows partial protection is enough to
 *    safeguard the downside. So "non-PP" is by design and is LOW risk, not high.
 *  - A 65% MF / 35% SP portfolio runs at ~40% LOWER risk vs the Nifty50.
 *
 * Therefore the gauge is a credit-weighted composite that keeps a well-issued,
 * partially-protected SP book firmly in the LOW–MODERATE band, and moves
 * dynamically with the actual issuer mix, protection mix, tenor and underlying.
 */

// Issuers that pass (or are group entities of) the Document-105 credit screen.
// Matched case-insensitively as substrings against the issuer field.
const CREDIBLE_ISSUER_TOKENS = [
  "argfl", // qualified issuer per Document 105
  "anand rathi",
  "arfsl",
  "arit",
  "nwfl", // Nuvama
  "nwil",
  "nuvama",
  "edelweiss",
  "ecl",
  "ecap",
  "efil",
  "efpl",
  "ebl",
  "citi",
  "deutsche",
  "rbs",
  "sonata",
  "motilal",
  "morgan",
  "barclays",
  "nomura",
];

function issuerIsCredible(issuer?: string) {
  const text = (issuer ?? "").toLowerCase();
  if (!text.trim()) return false;
  return CREDIBLE_ISSUER_TOKENS.some((token) => text.includes(token));
}

function isEquityLinked(product: ProductRecord) {
  const u = `${product.underlying ?? ""} ${product.productType ?? ""}`.toLowerCase();
  if (u.includes("debt") || u.includes("bond") || u.includes("g-sec") || u.includes("gsec")) return false;
  return true; // index/equity-linked by default
}

export interface CategoryRisk {
  category: ProductCategory;
  score: number; // 0 (safe) .. 100 (risky)
  band: "LOW" | "MODERATE" | "ELEVATED";
  credibleShare: number; // 0..1, notional-weighted
  protectedShare: number; // 0..1
  listedShare: number; // 0..1
  avgCoupon: number; // decimal
  avgTenorYears: number;
  components: { credit: number; protection: number; tenor: number; market: number };
}

export function riskBand(score: number): CategoryRisk["band"] {
  if (score <= 35) return "LOW";
  if (score <= 65) return "MODERATE";
  return "ELEVATED";
}

export function computeCategoryRisk(category: ProductCategory, products: ProductRecord[]): CategoryRisk {
  const totalNotional = products.reduce((s, p) => s + (p.tradeAmount ?? 0), 0) || 1;
  const weight = (p: ProductRecord) => (p.tradeAmount ?? 0) / totalNotional;

  let credibleShare = 0;
  let protectedShare = 0;
  let exposedShare = 0;
  let listedShare = 0;
  let equityShare = 0;
  let tenorYearsAcc = 0;
  let tenorWeight = 0;
  let couponAcc = 0;
  let couponCount = 0;

  for (const p of products) {
    const w = weight(p);
    if (issuerIsCredible(p.issuer)) credibleShare += w;
    const prot = classifyProtection(p.principalProtection);
    if (prot === "protected") protectedShare += w;
    else if (prot === "exposed") exposedShare += w;
    if ((p.listing ?? "").toLowerCase() === "listed") listedShare += w;
    if (isEquityLinked(p)) equityShare += w;
    if (p.tenorDays) {
      const years = p.tenorDays > 100 ? p.tenorDays / 365 : p.tenorDays; // some rows store years
      tenorYearsAcc += years * w;
      tenorWeight += w;
    }
    const coupon = getCouponPercent(p);
    if (coupon !== undefined) {
      couponAcc += coupon;
      couponCount += 1;
    }
  }

  const avgTenorYears = tenorWeight > 0 ? tenorYearsAcc / tenorWeight : 0;
  const avgCoupon = couponCount > 0 ? couponAcc / couponCount : 0;

  // --- Component scores (each 0..100, higher = riskier) ---
  // Credit (dominant): credible issuers carry a small floor (~8); fully
  // uncredible book peaks near 42. This keeps an ARGFL-heavy book very safe.
  const credit = 8 + 34 * (1 - credibleShare);
  // Protection: PP → ~5; non-PP partial protection → ~30 (mitigated, per Doc 105);
  // unknown → 22.
  const unknownShare = Math.max(0, 1 - protectedShare - exposedShare);
  const protection = protectedShare * 5 + exposedShare * 30 + unknownShare * 22;
  // Tenor: longer lock-in is modestly riskier; ~8 pts/yr, capped at 45.
  const tenor = Math.min(45, avgTenorYears * 8);
  // Market: equity-linked carries more path risk than debt-linked.
  const market = 12 + 26 * equityShare;

  const score = Math.round(
    Math.max(0, Math.min(100, credit * 0.5 + protection * 0.2 + tenor * 0.15 + market * 0.15)),
  );

  return {
    category,
    score,
    band: riskBand(score),
    credibleShare,
    protectedShare,
    listedShare,
    avgCoupon,
    avgTenorYears,
    components: {
      credit: Math.round(credit),
      protection: Math.round(protection),
      tenor: Math.round(tenor),
      market: Math.round(market),
    },
  };
}

export function computeCategoryRisks(products: ProductRecord[]): CategoryRisk[] {
  const byCategory = new Map<ProductCategory, ProductRecord[]>();
  for (const p of products) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }
  return [...byCategory.entries()].map(([category, list]) => computeCategoryRisk(category, list));
}
