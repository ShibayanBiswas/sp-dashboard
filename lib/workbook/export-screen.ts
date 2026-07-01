import ExcelJS from "exceljs";

import type { ProductRecord } from "@/lib/types";
import type { ValuationResult } from "@/lib/workbook/valuation-engine";
import type { PayoffRowFlags } from "@/lib/workbook/payoff-pivots";
import { getProductOverview, parseExplanationBlocks } from "@/lib/product-narrative";
import { getCouponLabel, getDebenturePrice, getIndexEntryLevel, rawField } from "@/lib/product-utils";
import {
  formatCurrency,
  formatFormulaReturn,
  formatNumber,
  formatPercent,
  formatProductUnitValue,
  formatValuationAsOf,
} from "@/lib/utils";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD4B24C" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF111111" }, size: 11 };
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: "FF7A1E2C" } };
const PIVOT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE7E5E4" } },
  left: { style: "thin", color: { argb: "FFE7E5E4" } },
  bottom: { style: "thin", color: { argb: "FFE7E5E4" } },
  right: { style: "thin", color: { argb: "FFE7E5E4" } },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 22;
}

function styleDataRow(row: ExcelJS.Row, highlight = false) {
  row.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", wrapText: true };
    if (highlight) {
      cell.fill = PIVOT_FILL;
      cell.font = { bold: true };
    }
  });
}

function addSectionTitle(sheet: ExcelJS.Worksheet, row: number, title: string) {
  sheet.mergeCells(row, 1, row, 6);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = SECTION_FONT;
  return row + 1;
}

function addKeyValueBlock(sheet: ExcelJS.Worksheet, startRow: number, rows: Array<[string, string]>) {
  let r = startRow;
  for (const [label, value] of rows) {
    sheet.getCell(r, 1).value = label;
    sheet.getCell(r, 1).font = { bold: true };
    sheet.mergeCells(r, 2, r, 4);
    sheet.getCell(r, 2).value = value;
    sheet.getCell(r, 2).alignment = { wrapText: true };
    r++;
  }
  return r + 1;
}

async function saveWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function narrativeRows(product: ProductRecord) {
  const overview = getProductOverview(product);
  const blocks = parseExplanationBlocks(overview.explanation);
  const lines: string[] = [`${overview.title}`, overview.issuer ? `Issuer: ${overview.issuer}` : "", overview.isin ? `ISIN: ${overview.isin}` : ""];
  for (const block of blocks) {
    lines.push(block.content);
  }
  for (const line of overview.structure) {
    lines.push(line);
  }
  const coupon = getCouponLabel(product);
  if (product.tradeAmount) lines.push(`Notional: ${formatCurrency(product.tradeAmount)}`);
  if (coupon) lines.push(`Coupon: ${coupon}`);
  return lines.filter(Boolean);
}

function specRows(product: ProductRecord) {
  return [
    ["Issuer", product.issuer ?? rawField(product, "Issuer") ?? "—"],
    ["ISIN", product.isin ?? "—"],
    ["Product Code", product.series ?? rawField(product, "Product Code") ?? "—"],
    ["Trade Date", rawField(product, "Trade Date", "Trade Date/Opening date") ?? "—"],
    ["Allotment Date", rawField(product, "Allotment Date") ?? "—"],
    ["Underlying", product.underlying ?? "—"],
    ["Initial Fixing", formatNumber(getIndexEntryLevel(product))],
    ["Target Level", String(rawField(product, "Target Level", "Target Nifty ") ?? "—")],
    ["Final Obs. Date", product.lastObservationDateRaw ?? "—"],
    ["Redemption Date", product.maturityRaw ?? "—"],
    ["PP / Non-PP", product.principalProtection ?? "—"],
    ["Listed / Unlisted", product.listing ?? "—"],
    ["Tenor · Days", product.tenorDays ? formatNumber(product.tenorDays) : "—"],
  ] as Array<[string, string]>;
}

function addScenarioTable(sheet: ExcelJS.Worksheet, startRow: number, scenarios: PayoffRowFlags[]) {
  let r = startRow;
  const headers = ["Final Fixing", "Underlying Performance", "Product Return", "XIRR", "Plot kink"];
  headers.forEach((h, i) => {
    sheet.getCell(r, i + 1).value = h;
  });
  styleHeaderRow(sheet.getRow(r));
  r++;

  for (const row of scenarios) {
    sheet.getCell(r, 1).value = row.finalFixing;
    sheet.getCell(r, 2).value = formatPercent(row.performance, 1);
    sheet.getCell(r, 3).value = formatFormulaReturn(row.maturityValue);
    sheet.getCell(r, 4).value = formatPercent(row.irr, 2);
    sheet.getCell(r, 5).value = row.isPivot ? "Yes" : "";
    styleDataRow(sheet.getRow(r), Boolean(row.isPivot));
    r++;
  }

  sheet.columns = [
    { width: 16 },
    { width: 22 },
    { width: 18 },
    { width: 12 },
    { width: 12 },
  ];
  return r;
}

export async function downloadValuationScreenExcel(options: {
  product: ProductRecord;
  valuation: ValuationResult | null;
  inputs: {
    valuationDate: string;
    niftyLevel: string;
    sensexLevel: string;
    debentures: string;
    isin: string;
    productCode: string;
  };
  outputSheet?: Array<[string, string]>;
}) {
  const { product, valuation, outputSheet } = options;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SP Dashboard · Anand Rathi Wealth";
  const sheet = wb.addWorksheet("Valuation Output", { views: [{ state: "frozen", ySplit: 1 }] });

  let r = 1;
  sheet.mergeCells(r, 1, r, 4);
  sheet.getCell(r, 1).value = "SP Dashboard — Valuation Output";
  sheet.getCell(r, 1).font = { bold: true, size: 14, color: { argb: "FF7A1E2C" } };
  sheet.getCell(r, 1).alignment = { vertical: "middle" };
  sheet.getRow(r).height = 28;
  r += 2;

  if (valuation) {
    r = addSectionTitle(sheet, r, "Mark-to-Market Summary");
    r = addKeyValueBlock(sheet, r, [
      ["Current Value", formatProductUnitValue(valuation.productValue)],
      ["Abs. Return vs Deal Price", formatPercent(valuation.absReturn, 1)],
      ["Product IRR (annualized)", formatPercent(valuation.productIrr, 2)],
      ["Total Amount", formatCurrency(valuation.totalAmount, false)],
    ]);
  }

  if (outputSheet?.length) {
    r = addSectionTitle(sheet, r, "Output Sheet");
    r = addKeyValueBlock(sheet, r, outputSheet);
  }

  r = addSectionTitle(sheet, r, "Product Overview");
  for (const line of narrativeRows(product)) {
    sheet.mergeCells(r, 1, r, 4);
    sheet.getCell(r, 1).value = line;
    sheet.getCell(r, 1).alignment = { wrapText: true };
    r++;
  }

  await saveWorkbook(wb, `SP-Valuation-${product.isin ?? "product"}.xlsx`);
}

export async function downloadPayoffScreenExcel(options: {
  product: ProductRecord;
  scenarios: PayoffRowFlags[];
  marketMove: number;
  liveLevel: number;
  inputs: {
    debentures: string;
    pricePerDebenture: string;
    purchaseDate: string;
  };
  kpis: Array<[string, string]>;
}) {
  const { product, scenarios, kpis } = options;
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Payoff Output");

  let r = 1;
  sheet.mergeCells(r, 1, r, 5);
  sheet.getCell(r, 1).value = "SP Dashboard — Payoff Output";
  sheet.getCell(r, 1).font = { bold: true, size: 14, color: { argb: "FF7A1E2C" } };
  r += 2;

  r = addSectionTitle(sheet, r, "Live KPIs");
  r = addKeyValueBlock(sheet, r, kpis);

  r = addSectionTitle(sheet, r, "Product Overview");
  for (const line of narrativeRows(product)) {
    sheet.mergeCells(r, 1, r, 5);
    sheet.getCell(r, 1).value = line;
    sheet.getCell(r, 1).alignment = { wrapText: true };
    r++;
  }

  r = addSectionTitle(sheet, r, "Product Specifications");
  r = addKeyValueBlock(sheet, r, specRows(product));

  r = addSectionTitle(sheet, r, "Payoff Scenarios (plot kinks highlighted)");
  addScenarioTable(sheet, r, scenarios);

  await saveWorkbook(wb, `SP-Payoff-${product.isin ?? product.name}.xlsx`);
}

export async function downloadProductDetailsScreenExcel(options: {
  product: ProductRecord;
  valuation: ValuationResult | null;
  scenarios: PayoffRowFlags[];
  marketMove: number;
  canValue: boolean;
  inputs: {
    valuationDate: string;
    debentures: string;
    niftyLevel: string;
    sensexLevel: string;
  };
}) {
  const { product, valuation, scenarios, canValue } = options;
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Product Details");

  let r = 1;
  sheet.mergeCells(r, 1, r, 5);
  sheet.getCell(r, 1).value = "SP Dashboard — Product Details Output";
  sheet.getCell(r, 1).font = { bold: true, size: 14, color: { argb: "FF7A1E2C" } };
  r += 2;

  if (canValue && valuation) {
    r = addSectionTitle(sheet, r, "Valuation Summary");
    r = addKeyValueBlock(sheet, r, [
      ["Current Value", formatProductUnitValue(valuation.productValue)],
      ["Abs. Return vs Deal Price", formatPercent(valuation.absReturn, 1)],
      ["IRR (annualized)", formatPercent(valuation.productIrr, 2)],
    ]);
  }

  r = addSectionTitle(sheet, r, "Product Overview");
  for (const line of narrativeRows(product)) {
    sheet.mergeCells(r, 1, r, 5);
    sheet.getCell(r, 1).value = line;
    sheet.getCell(r, 1).alignment = { wrapText: true };
    r++;
  }

  r = addSectionTitle(sheet, r, "Specifications");
  r = addKeyValueBlock(sheet, r, specRows(product));

  r = addSectionTitle(sheet, r, "Payoff Scenarios (plot kinks highlighted)");
  addScenarioTable(sheet, r, scenarios);

  await saveWorkbook(wb, `SP-Details-${product.isin ?? "product"}.xlsx`);
}
