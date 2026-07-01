import automatedPrimaryDashboard from "@/lib/data/reference-workbooks/automated-primary-dashboard.json";
import masterSchema from "@/lib/data/master-schema.json";
import primaryValuation from "@/lib/data/reference-workbooks/primary-valuation.json";

type ExtractedWorkbook = {
  workbook: string;
  sheets: Array<{
    name: string;
    state: string;
    path: string;
    dimension: string | null;
    formulaFunctions: Array<[string, number]>;
    formulaSheetRefs: Array<[string, number]>;
    sampleFormulas: Array<{
      cell: string;
      formula: string;
      cached: string | number | null;
    }>;
    sampleRows: Array<Record<string, unknown>>;
  }>;
};

export type LogicWorkbookEntry = {
  title: string;
  role: string;
  workbook: string;
  sheets: ExtractedWorkbook["sheets"];
};

const masterWorkbookEntry: LogicWorkbookEntry = {
  title: "Master Source Workbook",
  role: "Source of truth for the Primary product universe (Primary sheet + hidden support tabs).",
  workbook: masterSchema.master.workbook,
  sheets: Object.keys(masterSchema.master.categorySheets).map((name) => ({
    name,
    state: "visible",
    path: name,
    dimension: null,
    formulaFunctions: [],
    formulaSheetRefs: [],
    sampleFormulas: [],
    sampleRows: [],
  })),
};

const workbooks: LogicWorkbookEntry[] = [
  masterWorkbookEntry,
  {
    title: "Automated Primary Dashboard",
    role: "Reference dashboard workbook for primary search, details, and master output logic.",
    workbook: (automatedPrimaryDashboard as ExtractedWorkbook).workbook,
    sheets: (automatedPrimaryDashboard as ExtractedWorkbook).sheets,
  },
  {
    title: "Primary Valuation Workbook",
    role: "Reference valuation workbook using Working/lookup-driven logic for primary structures.",
    workbook: (primaryValuation as ExtractedWorkbook).workbook,
    sheets: (primaryValuation as ExtractedWorkbook).sheets,
  },
];

export function getLogicDirectory() {
  return workbooks;
}

export function getWorkbookOverview() {
  return workbooks.map((entry) => ({
    title: entry.title,
    workbook: entry.workbook,
    visibleSheets: entry.sheets.filter((sheet) => sheet.state === "visible").length,
    hiddenSheets: entry.sheets.filter((sheet) => sheet.state !== "visible").length,
    formulaSheetCount: entry.sheets.filter((sheet) => sheet.sampleFormulas.length > 0).length,
  }));
}

export function getUniversalFormulaIndex() {
  const formulaMap = new Map<string, number>();
  for (const workbook of workbooks) {
    for (const sheet of workbook.sheets) {
      for (const [name, count] of sheet.formulaFunctions) {
        formulaMap.set(name, (formulaMap.get(name) ?? 0) + count);
      }
    }
  }

  return [...formulaMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function getHiddenDependencyIndex() {
  const dependencies = new Map<string, number>();
  for (const workbook of workbooks) {
    for (const sheet of workbook.sheets.filter((entry) => entry.state !== "visible")) {
      dependencies.set(sheet.name, (dependencies.get(sheet.name) ?? 0) + 1);
    }
  }

  return [...dependencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function getReferenceFormulaCatalog() {
  const formulas: Array<{
    workbook: string;
    sheet: string;
    cell: string;
    formula: string;
    cached?: string | number | null;
  }> = [];

  for (const workbook of workbooks) {
    for (const sheet of workbook.sheets) {
      for (const entry of sheet.sampleFormulas) {
        formulas.push({
          workbook: workbook.workbook,
          sheet: sheet.name,
          cell: entry.cell,
          formula: entry.formula,
          cached: entry.cached,
        });
      }
    }
  }

  return formulas;
}

export function getCategoryLogicMap() {
  return [
    {
      category: "Primary",
      sourceSheet: "Primary",
      keyColumns: ["Name on Signup Form", "Underlying", "Formulae", "Trade Amount", "Maturity", "Coupon (%)"],
      hiddenDependencies: ["2nd last obs dates", "Sheet2"],
      valuationModule: "Primary Valuation",
      payoffModule: "Primary Payoff",
    },
  ];
}
