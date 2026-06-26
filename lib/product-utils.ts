import type { ProductCategory, ProductRecord } from "@/lib/types";

export function rawField(product: ProductRecord | undefined, ...keys: string[]) {
  if (!product) {
    return undefined;
  }
  for (const key of keys) {
    const value = product.raw[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return undefined;
}

export function parseNumericField(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getIndexEntryLevel(product: ProductRecord) {
  return (
    parseNumericField(rawField(product, "Actual Entry Level", "Entry Level", "Initial Level", "Initial Fixing Level")) ??
    parseNumericField(rawField(product, "Target Nifty", "Target Level")) ??
    10000
  );
}

/** Payoff / final-fixing anchor — debenture price when present, else index entry. */
export function getPayoffEntryLevel(product: ProductRecord) {
  return (
    parseNumericField(rawField(product, "price per debenture")) ??
    product.pricePerDebenture ??
    getIndexEntryLevel(product)
  );
}

/** @deprecated alias — payoff anchor level */
export function getEntryLevel(product: ProductRecord) {
  return getPayoffEntryLevel(product);
}

export function getTargetLevel(product: ProductRecord) {
  return parseNumericField(rawField(product, "Target Level", "Final Observation Level"));
}

export function getFaceValue(product: ProductRecord) {
  return (
    parseNumericField(rawField(product, "Face Value", "Initial Investment (Rs.)")) ??
    product.pricePerDebenture ??
    100000
  );
}

export function resolveProduct(
  products: ProductRecord[],
  {
    isin,
    productCode,
    productName,
    category,
  }: {
    isin?: string;
    productCode?: string;
    productName?: string;
    category?: ProductCategory;
  },
) {
  const pool = category ? products.filter((product) => product.category === category) : products;

  if (isin?.trim()) {
    const match = pool.find((product) => product.isin?.toLowerCase().includes(isin.trim().toLowerCase()));
    if (match) {
      return match;
    }
  }

  if (productCode?.trim()) {
    const match = pool.find((product) => product.series?.toLowerCase().includes(productCode.trim().toLowerCase()));
    if (match) {
      return match;
    }
  }

  if (productName?.trim()) {
    const match = pool.find((product) => product.name === productName);
    if (match) {
      return match;
    }
  }

  return pool[0];
}

/**
 * Coupon / participation values in the master arrive as messy strings such as
 * "49.0%", "150% PR", "59% / 1.59", "N/A". Extract the first numeric token,
 * treat values > 1.5 as percentages (so "49%" → 0.49, "150%" → 1.5).
 */
export function parseCouponString(value?: string | number | null): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return value > 1.5 ? value / 100 : value;
  }
  const text = String(value).trim();
  if (!text || /^(n\/?a|na|-|nil)$/i.test(text)) return undefined;
  const match = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const num = Number(match[0]);
  if (!Number.isFinite(num)) return undefined;
  // A "%" sign or a magnitude > 1.5 implies a percentage figure.
  return text.includes("%") || num > 1.5 ? num / 100 : num;
}

/** Effective headline return: typed couponPercent, else parsed from raw columns. */
export function getCouponPercent(product: ProductRecord): number | undefined {
  if (product.couponPercent !== undefined) return product.couponPercent;
  return (
    parseCouponString(rawField(product, "Coupon (%)")) ??
    parseCouponString(rawField(product, "Coupon / PR / DM", "Product return"))
  );
}

export type ProtectionClass = "protected" | "exposed" | "unknown";

/**
 * Classify principal protection. IMPORTANT: check "non" first, because
 * "Non-Principal Protected".includes("principal protected") is true.
 */
export function classifyProtection(flag?: string | null): ProtectionClass {
  const text = String(flag ?? "").toLowerCase();
  if (!text.trim()) return "unknown";
  if (text.includes("non") || text.includes("npp") || /\bn-?pp\b/.test(text)) return "exposed";
  if (text.includes("principal protected") || text.includes("capital guarantee") || /\bpp\b/.test(text)) {
    return "protected";
  }
  return "unknown";
}

/** True when the product is benchmarked to the Sensex (else assume Nifty). */
export function isSensexLinked(product: ProductRecord | undefined) {
  const underlying = (product?.underlying ?? rawField(product, "Underlying") ?? "").toLowerCase();
  return underlying.includes("sensex");
}

/**
 * Mirrors Working!M = IF(A="Nifty", $D$1 (Nifty level), $C$1 (Sensex level)).
 * Picks the valuation-date index level appropriate for the product underlying.
 * Falls back to the product entry level so the engine never divides by zero.
 */
export function resolveValuationLevel(
  product: ProductRecord | undefined,
  levels: { niftyLevel?: number; sensexLevel?: number; currentLevel?: number },
) {
  if (levels.currentLevel && Number.isFinite(levels.currentLevel) && levels.currentLevel > 0) {
    return levels.currentLevel;
  }
  const picked = isSensexLinked(product) ? levels.sensexLevel : levels.niftyLevel;
  if (picked && Number.isFinite(picked) && picked > 0) {
    return picked;
  }
  return product ? getIndexEntryLevel(product) : 0;
}

export function getDebenturePrice(product: ProductRecord) {
  return (
    product.pricePerDebenture ??
    parseNumericField(rawField(product, "price per debenture", "Price / Debenture", "Price per debenture")) ??
    getFaceValue(product)
  );
}
