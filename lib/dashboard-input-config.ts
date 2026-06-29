export type InputSurface = "valuation-primary" | "payoff-primary";

export const VALUATION_DISCLAIMER =
  "The valuation shown above is as per ARWL estimates and may differ from the actual unwind value because of volatility, illiquidity of long-dated options, and prevailing market levels on the day of unwind. ARWL does not guarantee the same.";

export const INPUT_HINT = "* Highlighted cells are for inputs";

export const IDENTITY_HINT = "Enter any ONE of the below fields";

export function getPayoffSteps() {
  return [
    {
      step: 1,
      title: "Set deal parameters",
      items: [
        "Product Name — select from dropdown / product list",
        "Current Level — closing underlying level on the trade date",
        "Purchase Date — deal date",
        "No. of debentures — as purchased by the client",
        "Price / debenture — deal price as provided by the team",
      ],
    },
    {
      step: 2,
      title: "Scenario sweep",
      items: [
        "Underlying performance levels can be changed as required, except the 0% anchor row",
        "Review maturity value, return on investment, and IRR per scenario row",
      ],
    },
  ];
}

export function getValuationInputFields() {
  return [
    { key: "isin", label: "Enter The ISIN", type: "text" as const, highlight: true },
    { key: "or1", label: "OR", type: "divider" as const },
    { key: "productCode", label: "Enter the Product Code", type: "text" as const, highlight: true },
    { key: "or2", label: "OR", type: "divider" as const },
    { key: "productName", label: "Select the Primary Structured Product", type: "product" as const, highlight: true },
    { key: "valuationDate", label: "Valuation Date", type: "date" as const, highlight: true },
    { key: "niftyLevel", label: "Val. Date Nifty Level", type: "number" as const, highlight: true },
    { key: "sensexLevel", label: "Val. Date Sensex Level", type: "number" as const, highlight: true },
    { key: "debentures", label: "No. of Debentures", type: "number" as const, highlight: true },
  ];
}

export const DEBENTURE_PRESETS = ["1", "10", "25", "50", "100", "250", "500", "1000"];

export const INPUT_FIELD_HINTS: Record<string, { title: string; paragraphs: string[] }> = {
  isin: {
    title: "ISIN",
    paragraphs: [
      "International Securities Identification Number — unique 12-character code for the debenture.",
      "Enter any one identity field (ISIN, product code, or name). The app resolves the rest automatically.",
    ],
  },
  productCode: {
    title: "Product Code",
    paragraphs: [
      "Desk series / product code from the signup form (e.g. 637 for Nifty Accelerator).",
      "Matches the Primary master sheet column Series.",
    ],
  },
  productName: {
    title: "Product Name",
    paragraphs: [
      "Full name as on the signup form. Dropdown is filtered to the active lifecycle bucket.",
      "Selecting a product loads its formula, entry level, and default debenture count from the master file.",
    ],
  },
  valuationDate: {
    title: "Valuation Date",
    paragraphs: [
      "Mark-to-market date — defaults to today from Yahoo-synced desk clock.",
      "Drives elapsed tenor, discounting branch, and IRR in the Working sheet logic.",
    ],
  },
  niftyLevel: {
    title: "Valuation Date Nifty Level",
    paragraphs: [
      "Closing Nifty 50 level on the valuation date. Auto-filled from Yahoo Finance (^NSEI).",
      "Used when the product underlying is Nifty (or Nifty-linked indices).",
    ],
  },
  sensexLevel: {
    title: "Valuation Date Sensex Level",
    paragraphs: [
      "Closing Sensex level on the valuation date. Auto-filled from Yahoo Finance (^BSESN).",
      "Used when the product underlying is Sensex.",
    ],
  },
  debentures: {
    title: "No. of Debentures",
    paragraphs: [
      "Client holding size. Defaults from trade notional ÷ price per debenture in the master file.",
      "Product Value is per debenture; Total Amount = Product Value × debentures.",
    ],
  },
  currentLevel: {
    title: "Current Level",
    paragraphs: [
      "Live closing level of the linked index from Yahoo Finance — read-only on Payoff.",
      "Drives the highlighted current scenario row in the payoff table.",
    ],
  },
  purchaseDate: {
    title: "Purchase Date",
    paragraphs: [
      "Client trade / allotment date. Defaults from the master Trade Date field.",
      "Used for payoff tenor and client deal context.",
    ],
  },
  pricePerDebenture: {
    title: "Price / Debenture",
    paragraphs: [
      "Deal price per debenture as executed. Defaults from the master price field.",
      "Combined with debenture count to size maturity amounts in each scenario row.",
    ],
  },
};
