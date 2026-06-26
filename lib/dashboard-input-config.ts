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
