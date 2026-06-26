import { format, isValid, parse } from "date-fns";

const DATE_PATTERNS = ["d-MMM-yy", "dd-MMM-yy", "d-MMM-yyyy", "dd-MMM-yyyy", "M-yyyy", "dd/MM/yyyy"];

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
  if (Number.isFinite(numeric) && numeric > 30000 && !text.includes("-")) {
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + numeric * 86400000);
  }

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(text, pattern, new Date());
    if (isValid(parsed)) {
      return parsed;
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
