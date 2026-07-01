import type { InfoBlurb } from "@/lib/info-blurb";

/** Plain-language section descriptions — one paragraph, five lines each. */
export const SECTION_INFO: Record<string, InfoBlurb> = {
  "home-kpis": {
    title: "Understanding these headline numbers",
    body: "These four tiles summarise the portfolio at a glance: live notional, active count, expired count, and near-term expiries.\nLive Notional is total invested money across all products, shown in crores of rupees.\nActive counts products still running; Expired counts those already matured.\nExpiring in 3M and 1M highlight deals maturing soon for reinvestment planning.\nFigures refresh automatically when you upload an updated master file from Home.",
  },
  "home-filter": {
    title: "How the portfolio filter works",
    body: "Every product moves from launch through maturity — filter by Ongoing, Expiring in 3M, Expiring in 1M, or Expired.\nThe filter updates the whole home page: summary tiles, maturity chart, and shortcuts below.\nDefault view is the live book for day-to-day checks.\nChanging this filter only affects Home; it does not change selections elsewhere.\nPick the bucket that matches the client conversation you are preparing.",
  },
  "home-maturity": {
    title: "Reading the maturity ladder",
    body: "This chart groups products by how soon they mature and sizes each bar by invested money in crores.\nNear-term bars mean cash returns soon and may need reinvestment planning.\nFurther-out bars mean the book stays invested longer.\nHover any bar for the exact crore amount in that window.\nProducts without a maturity date appear under Unknown so nothing is dropped.",
  },
  "home-modules": {
    title: "What the desk modules do",
    body: "These shortcuts open the main desk areas: Valuation, Payoff, Portfolio, and Intel · Logic Atlas.\nValuation shows today’s mark; Payoff shows maturity outcomes across market levels.\nPortfolio is the searchable product register; Logic Atlas documents calculation paths.\nEach area uses the same rules as the desk spreadsheets in a faster layout.\nOpen the module that matches your question — value, payoff, list, or technical detail.",
  },

  "val-filter": {
    title: "What this valuation page covers",
    body: "Valuation answers: if the client exited today, what is the product worth?\nThis page mirrors the desk valuation workbook for Primary structured products.\nUse the top filter for live, expired, or full lists; tabs split the form from the register.\nOnly Primary products from the master file appear here.\nUploading a new master from Home refreshes the list automatically.",
  },
  "val-inputs": {
    title: "How to fill in the inputs",
    body: "Identify the product once by ISIN, product code, or name — highlighted fields are yours to enter.\nSet valuation date, Nifty and Sensex levels on that date, and debenture count.\nNifty-linked products use the Nifty level; Sensex-linked products use Sensex — they stay separate.\nDebenture count scales Product Value and Total Amount like the desk Working sheet.\nThe app applies each product’s payoff formula to produce today’s mark.",
  },
  "val-output": {
    title: "Reading the output sheet",
    body: "Product Value and Total Amount scale with debenture count; Abs. Return vs Deal Price is X/U − 1 on deal price.\nProduct IRR is annualised from allotment (trade date) to the valuation date — never before trade.\nZ Performance uses the Working!O path (2nd-last obs fixing vs entry), not raw M/K.\nAmounts use ₹ and Indian comma grouping for client-ready sharing.\nThe valuation-date index level is shown beside the result for audit.",
  },
  "val-products": {
    title: "About the product list",
    body: "Full register: name, series, ISIN, issuer, underlying, invested amount, and maturity.\nSearch by name, ISIN, series, issuer, or underlying — same keys as the desk lookup cells.\nClick a row to select that product for the valuation form.\nInvested amounts display in rupees crores with comma grouping.\nYour selection carries through so you do not search twice.",
  },
  "val-workings": {
    title: "What the workings table shows",
    body: "Step-by-step view: entry level, current level, Z, absolute return, IRR, and final rupee value.\nMatches the hidden Working grid in the valuation workbook for analyst audit.\nFigures update whenever valuation date or market levels change.\nUse it to reconcile headline output to intermediate calculation steps.\nThe detailed grid stays available even when not shown on the main screen.",
  },

  "pay-filter": {
    title: "What this payoff page covers",
    body: "Payoff answers: what will this product pay at maturity under different market levels?\nThis page mirrors the desk primary payoff dashboard.\nThe top filter chooses live, expired, or wider universes; tabs split deal screen from search.\nDefault is live products unless you widen the filter.\nA product picked on Home can carry through when you open Payoff next.",
  },
  "pay-inputs": {
    title: "How to enter the deal",
    body: "Choose the product, then fill highlighted fields: current index, purchase date, debentures, and price per debenture.\nFor most deals the current level is the closing index on the trade date.\nPrice and count define client investment; each scenario row shows possible returns.\nChange the current level to stress a different starting point — chart and table update immediately.\nInputs match the desk payoff sheet layout and defaults from the master file.",
  },
  "pay-output": {
    title: "Reading the payoff output",
    body: "Table and chart show returns across many possible maturity index levels — fall through rise.\nEach row lists final fixing, performance vs entry, maturity value, return, and IRR.\nThe chart shows caps, floors, and kinks — often the clearest client explanation.\nColumns match the desk payoff grid: Final Fixing, Performance, Maturity value, Returns, XIRR.\nUse the table for exact numbers and the chart for payoff shape.",
  },
  "pay-search": {
    title: "About product search",
    body: "Find one product quickly by name, ISIN, series, or underlying.\nSelecting a result loads it into the main payoff screen for immediate analysis.\nResults respect the live or expired filter set at the top of the page.\nCheck the ISIN in the specifications panel when two names look similar.\nSearch is the fastest path from lookup to payoff table.",
  },

  "an-lifecycle": {
    title: "Lifecycle universe",
    body: "Chart splits the book by status — ongoing, maturing soon, expired — sized by money in crores.\nLarge ongoing slice means most capital is still invested.\nLarge expired slice means much of the historical book has already paid out.\nLegend shows both product count and rupee amount per slice.\nNear-term expiry bands are separate so reinvestment timing is visible.",
  },
  "an-coupon": {
    title: "Coupon distribution",
    body: "Groups products by headline coupon band and shows invested money in each band, in crores.\nReveals whether the book tilts to lower steady returns or higher ambitious payoffs.\nProducts without a stated coupon sit in a separate bucket.\nBar height reflects invested amount, not just product count.\nUse alongside protection mix for a fuller risk picture.",
  },
  "an-protection": {
    title: "Principal protection mix",
    body: "Shows how invested money divides between principal-protected and capital-at-risk deals, in crores.\nQuick read on portfolio risk character — more protected money means a conservative book.\nLabels follow exact wording from the product file to avoid misclassification.\nUnclassified slice means the protection field was blank in source data.\nPair with coupon and tenor charts for balanced interpretation.",
  },
  "an-underlying": {
    title: "Underlying exposure",
    body: "Ranks underlyings — Nifty, Sensex, single names — by linked invested money in crores.\nHighlights concentration: one dominant index ties portfolio outcomes to that market.\nTop ten underlyings by amount keep the chart readable.\nLong index names stay legible on screen.\nUse to spot single-index dependency before client reviews.",
  },
  "an-tenor": {
    title: "Tenor profile",
    body: "Groups the book by tenor — under a year, one to two years, and so on — by money in crores.\nShort-tenor weight returns cash sooner; long-tenor weight keeps money invested longer.\nUnknown tenor still counts rather than disappearing from the chart.\nRead alongside the home maturity ladder for timing and reinvestment context.\nTenor mix affects sensitivity to short-term market moves.",
  },
  "an-radar": {
    title: "Category risk radar",
    body: "Gauges summarise size, average coupon, listed share, and issuer quality in one scorecard.\nHigh coupon with lower protection suggests a more ambitious profile; the reverse is conservative.\nRisk score weighs issuer credibility, protection, tenor, and market linkage.\nFigures beneath each gauge explain the needle in plain terms.\nRead gauges together — no single needle tells the whole story.",
  },

  "intel-overview": {
    title: "What Logic Atlas shows",
    body: "Technical map from master ingest through valuation, payoff, and analytics — for analysts and engineers.\nEach module card is a major desk surface; select one to walk pipeline nodes left to right.\nLive KPI tiles reflect the current valid Primary book loaded in the app.\nClick any node for a plain-language explanation of that stage.\nNothing here changes product data — it documents and validates logic paths.",
  },
  "intel-pipeline": {
    title: "Reading a pipeline flow",
    body: "Arrows show data moving between parse, enrich, filter, aggregate, and output stages.\nGreen badge means every node is connected; warning means an orphaned stage needs review.\nSome modules branch in parallel before rejoining the desk data bus.\nAnalytics Laboratory maps to Analytics Lab; Home uses Desk Command Center instead.\nUse the module rail to compare valuation, payoff, analytics, and data foundation side by side.",
  },
  "intel-primitives": {
    title: "Computation primitives",
    body: "Building blocks repeated across product rows: lookups, conditionals, IRR solvers, Z substitution, roll-ups.\nCounts indicate registry complexity, not live runtime call volume.\nNo raw Excel formula text appears — the app resolves formulas when you run valuation or payoff.\nConditional branching routes by protection, listing, and tenor — same as lifecycle rules.\nAggregation roll-ups power Analytics Lab charts and Home KPI tiles.",
  },
};
