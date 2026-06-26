/**
 * Plain-language, client-friendly descriptions for every dashboard section.
 * Each entry has at least two short paragraphs so a non-technical reader can
 * understand what the panel shows and why it matters.
 */
export const SECTION_INFO: Record<string, { title?: string; paragraphs: string[] }> = {
  // ---------------------------------------------------------------- Home
  "home-kpis": {
    title: "Understanding these headline numbers",
    paragraphs: [
      "These four tiles are the quick health-check of the entire Primary structured-products book. “Live Notional” is the total money currently invested across all products (shown in crores of rupees), while “Active” counts how many products are still running and have not yet reached their maturity date.",
      "“Expired” shows how many products have already matured and paid out, and “Maturing 90D” flags the products that will mature within the next ninety days — the ones the desk should watch most closely. Together they tell you, at a glance, how big the book is and how much of it is still working for the client.",
    ],
  },
  "home-filter": {
    title: "How the portfolio filter works",
    paragraphs: [
      "Every product passes through a life-cycle: it is launched, it stays live for a few years, and then it matures (expires). This filter lets you switch the whole page between the “Live Book” (products still running), “Expired” (already matured), “Upcoming” (not yet started) or “All”.",
      "The dashboard covers the full Primary structured-products universe, so every filter you pick instantly re-cuts the entire page — the headline tiles, the maturity ladder and the logic modules all update to match the slice of the book you are looking at.",
    ],
  },
  "home-maturity": {
    title: "Reading the maturity ladder",
    paragraphs: [
      "The maturity ladder groups the live products by how soon they mature — within three months, three-to-six months, six-to-twelve months, beyond a year, or unknown. The height of each bar is the total money (in crores) maturing in that window.",
      "This helps the desk plan ahead: tall near-term bars mean a lot of money is about to be returned to clients and may need to be re-invested, while tall long-term bars mean the book is locked in for longer.",
    ],
  },
  "home-modules": {
    title: "What the desk modules do",
    paragraphs: [
      "These shortcuts jump straight to the main working areas of the app. “Valuation” tells you what a product is worth today; “Payoff” shows what a product will pay at maturity under different market levels.",
      "“Portfolio” lets you browse and search every product, and “Logic Atlas” explains the calculation logic behind the scenes. They are simply faster ways to reach the same pages in the top navigation.",
    ],
  },

  // ---------------------------------------------------------------- Valuation
  "val-filter": {
    title: "What this valuation page covers",
    paragraphs: [
      "Valuation answers a single question for the client: “If I exit this product today, what is it worth?” This page mirrors the Primary Structured Products Valuation Excel workbook, but in a faster, interactive form.",
      "Use the filter above to choose whether you are valuing live products, expired ones, or the entire book. The two tabs split the work into the valuation interface and the searchable product list.",
    ],
  },
  "val-inputs": {
    title: "How to fill in the inputs",
    paragraphs: [
      "You only need to identify the product once — type its ISIN, its product code, or pick it from the searchable dropdown. The white cells are the ones you fill in; everything else is calculated for you.",
      "Then enter the valuation date and the market levels (Nifty / Sensex) on that date, plus how many debentures the client holds. The engine uses the product’s own payoff formula to work out today’s fair value, just like the Excel sheet does.",
    ],
  },
  "val-output": {
    title: "Reading the output sheet",
    paragraphs: [
      "This panel restates the key facts of the selected product and the result of the valuation. “Product Value” and “Total Amount” are shown in crores, “Abs. Return” is the total percentage gain or loss so far, and “Product IRR” is that return expressed as a yearly rate.",
      "“Z Performance” is the heart of the calculation — it is how far the underlying index (e.g. Nifty) has moved from the product’s entry level. The payoff formula turns this Z into the product’s return, which is why it is shown alongside the entry and target levels.",
    ],
  },
  "val-products": {
    title: "About the product list",
    paragraphs: [
      "This is the full register of Primary products taken straight from the master workbook — name, series, ISIN, issuer, underlying index, invested amount and maturity date. You can filter it instantly with the search box.",
      "Click any row to select that product; the app then carries your choice across to the Valuation Interface and Workings tabs so you do not have to search again.",
    ],
  },
  "val-workings": {
    title: "What the workings table shows",
    paragraphs: [
      "This is the “show your working” view. For every product in the current book it runs the same valuation engine and lays out the intermediate numbers — entry level, current level, the Z performance, the absolute return, the annualised IRR and the final rupee valuation.",
      "It mirrors the hidden Working sheet of the Excel valuation file, so an analyst can audit exactly how each headline figure was produced rather than trusting a single number in isolation.",
    ],
  },

  // ---------------------------------------------------------------- Payoff
  "pay-filter": {
    title: "What this payoff page covers",
    paragraphs: [
      "Payoff answers a forward-looking question: “What will this product pay at maturity if the market ends up at a given level?” It recreates the Automated Primary SP Dashboard workbook used by the desk.",
      "The filter chooses which slice of the book you are working with. The two tabs below separate the deal-entry-and-result screen from a dedicated product search.",
    ],
  },
  "pay-inputs": {
    title: "How to enter the deal",
    paragraphs: [
      "Pick the product, then enter the deal specifics shown in the highlighted cells: the current underlying level, the purchase date, the number of debentures and the price paid per debenture. These mirror exactly the input cells of the Excel payoff sheet.",
      "For most Primary products the current level is the closing index level on the trade date. Once entered, the app sweeps a range of possible market outcomes and builds the full payoff picture automatically.",
    ],
  },
  "pay-output": {
    title: "Reading the payoff output",
    paragraphs: [
      "The scenario table and chart show what the product returns across many possible market levels at maturity — from a large fall to a large rise in the underlying. Each row gives the final fixing, the Z performance, the maturity value, the return on investment and the IRR.",
      "The curve makes the same information visual: it shows how the client’s payoff rises or is protected as the market moves, which is the clearest way to explain a structured product’s behaviour to a client.",
    ],
  },
  "pay-search": {
    title: "About product search",
    paragraphs: [
      "This tab is a focused finder for a single product. Start typing a name, ISIN, series or underlying and the matching products appear instantly in the dropdown and the results table.",
      "Selecting a product here loads it into the Non-PP SP Details tab, so you can move straight from finding the deal to analysing its payoff.",
    ],
  },

  // ---------------------------------------------------------------- Analytics
  "an-lifecycle": {
    title: "Lifecycle universe",
    paragraphs: [
      "This doughnut splits the book by life-cycle status — ongoing, maturing soon, expired and so on — and sizes each slice by the money (in crores) sitting in it. It is the big-picture view of where the portfolio stands.",
      "A large “ongoing” slice means most of the money is still invested and working; a large “expired” slice means much of the historical book has already paid out.",
    ],
  },
  "an-coupon": {
    title: "Coupon distribution",
    paragraphs: [
      "Many structured products promise a coupon — a headline return rate. This chart buckets the products by coupon band (0–5%, 5–10%, and so on) and shows how much money sits in each band, in crores.",
      "It tells you whether the book is concentrated in lower, safer returns or in higher, more aggressive payoffs.",
    ],
  },
  "an-protection": {
    title: "Principal protection mix",
    paragraphs: [
      "Some products guarantee the client’s original capital back (“principal protected”) while others put capital at risk in exchange for higher potential returns. This split shows how the invested money divides between the two, in crores.",
      "It is a quick read on the overall risk appetite of the book — a larger protected slice means a more conservative portfolio.",
    ],
  },
  "an-underlying": {
    title: "Underlying exposure",
    paragraphs: [
      "Every structured product is linked to an underlying — usually an index like Nifty or Sensex, or a stock. This chart ranks those underlyings by how much money (in crores) is linked to each.",
      "It highlights concentration risk: if most of the book depends on a single index, the portfolio’s fortunes are tied closely to that one market.",
    ],
  },
  "an-tenor": {
    title: "Tenor profile",
    paragraphs: [
      "Tenor is how long a product runs before maturity. This chart groups the book by tenor band — under a year, one-to-two years, and so on — and shows the money in each, in crores.",
      "A book weighted toward short tenors returns cash to clients sooner; one weighted toward long tenors keeps money invested for longer and is less sensitive to short-term market swings.",
    ],
  },
  "an-radar": {
    title: "Category risk radar",
    paragraphs: [
      "These gauges summarise the category along several dimensions at once — size, average coupon, how much is listed, and how much is principal protected. They give a balanced “scorecard” rather than a single number.",
      "Reading them together helps you judge the overall character of the book: high coupon with low protection points to an aggressive profile, while the opposite points to a conservative one.",
    ],
  },
};
