/**
 * Desk input defaults — seeded from the 31-May-26 reference valuation workbook
 * (Valuation!H16 / H17). Users can override in the UI; these are not product-specific.
 */
export const DESK_DEFAULTS = {
  valuationDate: "31-May-26",
  niftyLevel: "23547.75",
  sensexLevel: "74775.74",
  debentures: "100",
} as const;
