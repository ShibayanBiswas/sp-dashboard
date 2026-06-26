/**
 * Intelligence map of SP desk logic pipelines — derived from reference dashboards.
 * No spreadsheet identifiers exposed to the UI layer.
 */

export type LogicNodeKind = "input" | "process" | "engine" | "lookup" | "output";

export type LogicNode = {
  id: string;
  label: string;
  kind: LogicNodeKind;
  description: string;
};

export type LogicFlow = {
  from: string;
  to: string;
  label?: string;
};

export type LogicModule = {
  id: string;
  title: string;
  subtitle: string;
  accent: "cyan" | "purple" | "green" | "amber" | "rose";
  purpose: string;
  stageCount: number;
  metrics: Array<{ label: string; value: string }>;
  nodes: LogicNode[];
  flows: LogicFlow[];
  insights: string[];
  outputs: string[];
};

export const LOGIC_ATLAS_AUTHOR = "Shibayan Biswas";

export const logicModules: LogicModule[] = [
  {
    id: "data-foundation",
    title: "Product Master Intelligence",
    subtitle: "Canonical registry for the live Primary structured-products book",
    accent: "amber",
    purpose:
      "Ingests the Primary product universe — with observation calendars, payoff definitions, and matured-product history feeding every downstream module.",
    stageCount: 6,
    metrics: [
      { label: "Category", value: "Primary" },
      { label: "Registry layers", value: "6" },
      { label: "Role", value: "Source of truth" },
    ],
    nodes: [
      { id: "upload", label: "Master Upload", kind: "input", description: "Fresh product master file ingested and validated." },
      { id: "normalize", label: "Row Normalizer", kind: "process", description: "Cleans and aligns rows from the Primary sheet into canonical product records." },
      { id: "formula", label: "Payoff Definition Extractor", kind: "engine", description: "Captures Z-based payoff logic and product explanations per name." },
      { id: "obs", label: "Observation Calendar", kind: "lookup", description: "Links final observation dates and tenor metadata to each product." },
      { id: "ext", label: "Lifecycle Archive", kind: "lookup", description: "Matured and perpetual structures retained for audit." },
      { id: "feed", label: "Desk Data Bus", kind: "output", description: "Powers search, valuation, payoff, and portfolio analytics." },
    ],
    flows: [
      { from: "upload", to: "normalize", label: "parse" },
      { from: "normalize", to: "formula", label: "enrich" },
      { from: "normalize", to: "obs", label: "dates" },
      { from: "formula", to: "feed" },
      { from: "obs", to: "feed" },
      { from: "ext", to: "feed", label: "history" },
    ],
    insights: [
      "Every valuation and payoff path resolves back to this registry.",
      "Hidden calibration layers (observation lookbacks, extinguished rollovers) stay linked but invisible to end users.",
      "Ongoing vs expired classification derives from maturity and last observation anchors.",
    ],
    outputs: ["Product search index", "Formula catalog", "Category summaries", "Validation alerts"],
  },
  {
    id: "primary-dashboard",
    title: "Primary Portfolio Command",
    subtitle: "Search, enrich, and aggregate primary structured books",
    accent: "cyan",
    purpose:
      "Orchestrates primary SP discovery — resolve a product by ISIN, code, or name, hydrate full economics, and roll up combined equity portfolio returns.",
    stageCount: 10,
    metrics: [
      { label: "Surfaces", value: "10" },
      { label: "Resolver paths", value: "3" },
      { label: "Focus", value: "Primary lane" },
    ],
    nodes: [
      { id: "home", label: "Command Home", kind: "input", description: "Desk landing with portfolio pulse and navigation." },
      { id: "search", label: "Product Resolver", kind: "input", description: "Tri-modal lookup: ISIN → code → name cascade." },
      { id: "registry", label: "Master Cross-Reference", kind: "lookup", description: "Pulls issuer, underlying, entry/target levels, ISIN, series." },
      { id: "input", label: "Deal Parameterizer", kind: "input", description: "Trade date, notional, observation schedule inputs." },
      { id: "enrich", label: "Non-PP Enrichment", kind: "engine", description: "Hydrates payoff formula, protection flag, listing status." },
      { id: "portfolio", label: "Combined Portfolio Engine", kind: "engine", description: "Aggregates multiple primary lines into a single book view." },
      { id: "equity", label: "Equity Returns Link", kind: "process", description: "Maps underlying performance to portfolio return bands." },
      { id: "output", label: "Portfolio Output", kind: "output", description: "Live notional, maturity ladder, issuer concentration." },
    ],
    flows: [
      { from: "home", to: "search" },
      { from: "search", to: "registry", label: "resolve" },
      { from: "registry", to: "enrich" },
      { from: "input", to: "enrich" },
      { from: "enrich", to: "portfolio" },
      { from: "portfolio", to: "equity" },
      { from: "equity", to: "output" },
    ],
    insights: [
      "Product search mirrors the tri-field resolver pattern used across all desk modules.",
      "Non-principal-protected structures get full formula and explanation surfacing.",
      "Combined portfolio view weights by trade amount and aligns expiry buckets.",
    ],
    outputs: ["Resolved product card", "Combined notional", "Equity return bands", "Expiry-aligned structures"],
  },
  {
    id: "primary-valuation",
    title: "Primary Valuation Engine",
    subtitle: "Mark-to-model for live primary structures",
    accent: "purple",
    purpose:
      "Computes product value, absolute return, and IRR for primary SPs by resolving identity, pulling market levels, and interpolating through the working valuation lattice.",
    stageCount: 6,
    metrics: [
      { label: "Core outputs", value: "3" },
      { label: "Market inputs", value: "2" },
      { label: "Identity paths", value: "3" },
    ],
    nodes: [
      { id: "identity", label: "Identity Resolver", kind: "input", description: "ISIN, product code, or name — any one unlocks the row." },
      { id: "market", label: "Market Level Feed", kind: "input", description: "Valuation-date Nifty and Sensex closes." },
      { id: "working", label: "Valuation Lattice", kind: "engine", description: "Pre-computed Z curves, payoff interpolation, tenor-adjusted IRR paths." },
      { id: "z", label: "Z Performance", kind: "process", description: "(Current underlying / Entry level) − 1 drives payoff lookup." },
      { id: "irr", label: "IRR Interpolator", kind: "engine", description: "Time-weighted internal rate of return to maturity." },
      { id: "surface", label: "Valuation Surface", kind: "output", description: "Product value per debenture, abs. return %, product IRR %." },
    ],
    flows: [
      { from: "identity", to: "working", label: "lookup" },
      { from: "market", to: "z" },
      { from: "z", to: "working" },
      { from: "working", to: "irr" },
      { from: "irr", to: "surface" },
    ],
    insights: [
      "Valuation date market levels are the only moving inputs — everything else is registry-driven.",
      "Working lattice encodes thousands of pre-scenario payoff points for fast interpolation.",
      "Disclaimer logic flags structures where expiry is distant but capital is at risk today.",
    ],
    outputs: ["Product Value", "Abs. Return", "Product IRR", "Total Amount"],
  },
  {
    id: "primary-payoff",
    title: "Primary Payoff Laboratory",
    subtitle: "Scenario matrix for primary structured products",
    accent: "green",
    purpose:
      "Models primary deal economics — current level, debenture count, remaining tenor — and sweeps underlying performance Z from deep loss to upside cap to map the full payoff profile.",
    stageCount: 5,
    metrics: [
      { label: "Scenario rows", value: "18+" },
      { label: "Deal inputs", value: "5" },
      { label: "Curve layers", value: "2" },
    ],
    nodes: [
      { id: "select", label: "Product Selector", kind: "input", description: "Dropdown search across the Primary product universe." },
      { id: "hydrate", label: "Metadata Hydrator", kind: "lookup", description: "Issuer, ISIN, fixing levels, maturity, issue price from the master." },
      { id: "deal", label: "Deal Block", kind: "input", description: "Trade date, price/debenture, debenture count, current level." },
      { id: "substitute", label: "Formula Substitutor", kind: "engine", description: "Injects live Z into the payoff definition for each scenario row." },
      { id: "matrix", label: "Performance Matrix", kind: "engine", description: "Sweeps Z from −100% to +100% in defined steps." },
      { id: "curves", label: "Dual Curve Plot", kind: "output", description: "Payoff curve + underlying level trajectory with hover detail." },
    ],
    flows: [
      { from: "select", to: "hydrate" },
      { from: "hydrate", to: "deal" },
      { from: "deal", to: "substitute" },
      { from: "substitute", to: "matrix" },
      { from: "matrix", to: "curves" },
    ],
    insights: [
      "Current level defaults to the entry/initial-fixing level until the desk overrides it.",
      "Remaining tenor recalculates from trade date to the final maturity anchor.",
      "Maturity value, return on investment, and IRR populate per scenario row.",
    ],
    outputs: ["Scenario table", "Payoff curve", "Underlying plot", "IRR bands"],
  },
];

export function getLogicModule(id: string) {
  return logicModules.find((m) => m.id === id);
}

export type CategoryIntelligence = {
  category: string;
  dataLane: string;
  valuationPath: string;
  payoffPath: string;
  supportLayers: string[];
  keySignals: string[];
};

export function getCategoryIntelligenceMap(): CategoryIntelligence[] {
  return [
    {
      category: "Primary",
      dataLane: "Primary registry",
      valuationPath: "Primary Valuation Engine",
      payoffPath: "Primary Payoff Laboratory",
      supportLayers: ["Observation lookback", "Last-fixing calendar"],
      keySignals: ["Entry level", "Target level", "Trade amount", "Coupon", "Maturity"],
    },
  ];
}

export type ComputationPrimitive = {
  name: string;
  role: string;
  count: number;
  category: "lookup" | "conditional" | "financial" | "text" | "aggregate";
};

/** Abstract computation primitives — no raw formula text. */
export function getComputationPrimitives(): ComputationPrimitive[] {
  return [
    { name: "Cross-Reference Lookup", role: "Resolve product identity and economics from master index", count: 4200, category: "lookup" },
    { name: "Conditional Branching", role: "Route logic by protection, listing, and tenor state", count: 890, category: "conditional" },
    { name: "IRR / XIRR Solver", role: "Time-weighted return to maturity", count: 340, category: "financial" },
    { name: "Z Substitution", role: "Inject performance variable into payoff definition", count: 210, category: "text" },
    { name: "Range Interpolation", role: "Walk valuation lattice between scenario nodes", count: 180, category: "financial" },
    { name: "Aggregation Roll-up", role: "Sum notional, coupon, and exposure by bucket", count: 150, category: "aggregate" },
    { name: "Date Arithmetic", role: "Tenor, remaining days, observation scheduling", count: 120, category: "financial" },
    { name: "Index Match", role: "Product-level master resolution by ISIN, code, or name", count: 95, category: "lookup" },
  ];
}
