import { format, isValid, parse } from "date-fns";

const DATE_PATTERNS = [
  "dd-MMM-yyyy",
  "d-MMM-yyyy",
  "dd-MMM-yy",
  "d-MMM-yy",
  "dd/MMM/yyyy",
  "d/MMM/yyyy",
  "dd/MMM/yy",
  "d/MMM/yy",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "d/M/yy",
  "M-yyyy",
];

const REFERENCE_DATE = new Date();

/** Map 2-digit years to 19xx/20xx — desk convention for Primary master dates. */
function normalizeCentury(parsed: Date) {
  const year = parsed.getFullYear();
  if (year >= 100) {
    return parsed;
  }
  const adjusted = year >= 70 ? 1900 + year : 2000 + year;
  const next = new Date(parsed);
  next.setFullYear(adjusted);
  return next;
}

export function parseExcelishDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number" && value > 30000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + value * 86400000);
  }

  const text = String(value).trim();
  const numeric = Number(text.replace(/,/g, ""));
  if (Number.isFinite(numeric) && numeric > 30000 && !text.includes("-") && !text.includes("/")) {
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + numeric * 86400000);
  }

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(text, pattern, REFERENCE_DATE);
    if (isValid(parsed)) {
      return normalizeCentury(parsed);
    }
  }

  const native = new Date(text);
  return isValid(native) ? native : undefined;
}

export function formatExcelishDate(value?: string | number | null) {
  const parsed = parseExcelishDate(value);
  if (!parsed) {
    return value ? String(value) : "Unknown";
  }
  return format(parsed, "dd-MMM-yyyy");
}
