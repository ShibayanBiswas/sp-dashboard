import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic currency formatting — Indian desk units in Crores and Lakhs. */
export function toCrores(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  return num / 10_000_000;
}

export function toLakhs(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  return num / 100_000;
}

/** Format rupee amounts primarily in Crores for desk analytics. */
export function formatCrores(value: number, digits = 2) {
  const cr = toCrores(value);
  const sign = cr < 0 ? "-" : "";
  return `${sign}₹${Math.abs(cr).toFixed(digits)} Cr`;
}

export function formatCurrency(value: number, compact = true) {
  const num = Number.isFinite(value) ? value : 0;
  const sign = num < 0 ? "-" : "";
  const absolute = Math.abs(num);

  if (compact && absolute >= 10_000_000) {
    return `${sign}₹${(absolute / 10_000_000).toFixed(2)} Cr`;
  }
  if (compact && absolute >= 100_000) {
    return `${sign}₹${(absolute / 100_000).toFixed(2)} L`;
  }
  if (compact && absolute >= 1_000) {
    return `${sign}₹${(absolute / 1_000).toFixed(2)} K`;
  }

  return `${sign}₹${absolute.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Short axis-friendly money label that adapts between Crores and Lakhs. */
export function formatCroreLac(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_0) {
    return `${sign}₹${(abs / 10_000_000).toFixed(abs >= 100_000_000 ? 0 : 1)} Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(0)} L`;
  }
  if (abs === 0) return "0";
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(" ");
}
