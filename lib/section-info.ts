/**
 * Plain-language descriptions for every dashboard section.
 * Written for clients and relationship managers — four short paragraphs each.
 */
export const SECTION_INFO: Record<string, { title?: string; paragraphs: string[] }> = {
  // ---------------------------------------------------------------- Home
  "home-kpis": {
    title: "Understanding these headline numbers",
    paragraphs: [
      "These four tiles give you a quick snapshot of the portfolio. Live Notional is the total amount currently invested across all products, shown in crores of rupees. Active tells you how many products are still running and have not yet reached their maturity date.",
      "Expired counts products that have already matured and paid out. Expiring in 3M and Expiring in 1M highlight deals maturing soon — worth watching for reinvestment or client conversations.",
      "All amounts are shown in rupees with the ₹ symbol, using the same comma style you see on bank and demat statements.",
      "When you upload an updated product file from the home page, these numbers refresh automatically.",
    ],
  },
  "home-filter": {
    title: "How the portfolio filter works",
    paragraphs: [
      "Every product has a life story: it starts, it runs for a period, and then it matures. Filter by Ongoing, Expiring in 3M, Expiring in 1M, or Expired.",
      "Whatever you choose here updates the whole page — the summary tiles, the maturity chart, and the shortcuts below all follow the same filter.",
      "The default view is the live book, which is what most people want for a day-to-day check.",
      "Changing this filter only affects what you see on the home page. It does not change a product you may have picked elsewhere in the app.",
    ],
  },
  "home-maturity": {
    title: "Reading the maturity ladder",
    paragraphs: [
      "This chart groups products by how soon they mature — within three months, three to six months, six to twelve months, beyond a year, or where the date is not on file. The height of each bar is the total money in that group.",
      "Use it to plan ahead: tall bars in the near term mean a lot of money is coming back to clients soon and may need to be reinvested. Tall bars further out mean the book stays invested longer.",
      "Move your cursor over any bar to see the exact amount in rupees crores for that time window.",
      "Products without a maturity date on file still appear under Unknown so their money is never left out of the picture.",
    ],
  },
  "home-modules": {
    title: "What the desk modules do",
    paragraphs: [
      "These buttons take you straight to the main areas of the app. Valuation shows what a product is worth today. Payoff shows what it could pay at maturity under different market levels.",
      "Portfolio is a searchable list of every product. Logic Atlas explains how calculations work behind the scenes for anyone who wants the detail.",
      "Each area uses the same data and rules as the desk’s standard spreadsheets, but in a faster, interactive layout.",
      "Pick the module that matches your question — today’s value, future payoff, full list, or technical logic.",
    ],
  },

  // ---------------------------------------------------------------- Valuation
  "val-filter": {
    title: "What this valuation page covers",
    paragraphs: [
      "Valuation answers one question: if the client exited this product today, what would it be worth? This page is the interactive version of the desk’s valuation workbook.",
      "Use the filter at the top to focus on live products, expired ones, or the full list. The tabs below split the valuation form from the product register.",
      "Only Primary structured products appear here — the same universe as the master product file.",
      "Uploading a new master file from Home refreshes the product list here automatically.",
    ],
  },
  "val-inputs": {
    title: "How to fill in the inputs",
    paragraphs: [
      "Identify the product once — by ISIN, product code, or name from the dropdown. Highlighted fields are the ones you enter; the rest are calculated for you.",
      "Enter the valuation date, the Nifty and Sensex levels on that date, and how many debentures the client holds. The app applies the product’s own payoff rules to arrive at today’s value.",
      "Nifty and Sensex are kept separate so a Nifty-linked product uses the Nifty level, and a Sensex-linked product uses Sensex — they do not overwrite each other.",
      "Debenture count reflects the client’s holding size. Product Value and Total Amount scale with that count, just as on the desk spreadsheet.",
    ],
  },
  "val-output": {
    title: "Reading the output sheet",
    paragraphs: [
      "This panel summarises the product and the valuation result. Product Value and Total Amount are in crores. Abs. Return is the total gain or loss so far as a percentage. Product IRR expresses that return as an annual rate.",
      "Z Performance shows how far the linked index has moved from the product’s entry level — the starting point for the payoff calculation. Entry and target levels are shown alongside for context.",
      "Amounts use the ₹ symbol and Indian comma grouping so they are ready to share in client communications.",
      "The index level on the valuation date is shown next to the result so you can see which market input drove the number.",
    ],
  },
  "val-products": {
    title: "About the product list",
    paragraphs: [
      "This is the full register of products — name, series, ISIN, issuer, underlying index, invested amount, and maturity. Use the search box to find a name or code quickly.",
      "Click any row to select that product. Your choice carries through to the valuation form so you do not need to search again.",
      "Invested amounts are shown in rupees crores with commas for easy reading.",
      "You can search by name, ISIN, series, issuer, or underlying — the same keys the desk uses in the spreadsheet lookup cells.",
    ],
  },
  "val-workings": {
    title: "What the workings table shows",
    paragraphs: [
      "This is the detailed step-by-step view. For each product it shows entry level, current level, Z performance, absolute return, annualised IRR, and the final rupee valuation.",
      "It matches the hidden working grid in the valuation workbook so analysts can see exactly how each headline figure was built.",
      "The detailed grid is kept in the system for audit even when it is not shown on the main screen.",
      "Figures update whenever you change the valuation date or market levels.",
    ],
  },

  // ---------------------------------------------------------------- Payoff
  "pay-filter": {
    title: "What this payoff page covers",
    paragraphs: [
      "Payoff answers a forward-looking question: what will this product pay at maturity if the market finishes at a given level? This page mirrors the desk’s primary payoff dashboard.",
      "The filter at the top chooses which products you are working with. The tabs separate the main deal screen from product search.",
      "By default you work with live products unless you widen the filter to include expired ones.",
      "If you select a product on the home page, that choice can carry through when you open Payoff next.",
    ],
  },
  "pay-inputs": {
    title: "How to enter the deal",
    paragraphs: [
      "Choose the product, then fill in the highlighted fields: current index level, purchase date, number of debentures, and price per debenture — the same inputs as on the desk payoff sheet.",
      "For most products the current level is the closing index on the trade date. Once entered, the app builds a full range of possible outcomes at maturity.",
      "Price per debenture and count together define how much the client invested. Each scenario row shows what that investment could return under different market levels.",
      "Change the current level if you want to stress a different starting point — the chart and table update immediately.",
    ],
  },
  "pay-output": {
    title: "Reading the payoff output",
    paragraphs: [
      "The table and chart show returns across many possible market levels at maturity — from a sharp fall to a strong rise. Each row lists the final index level, performance versus entry, maturity value, return on investment, and IRR.",
      "The chart tells the same story visually: how payoff rises, flattens at a cap, or is protected on the downside — often the clearest way to explain a structured product to a client.",
      "The table columns match the desk payoff grid: Final Fixing, Performance, Maturity value, Returns, and XIRR.",
      "Use the table for exact numbers and the chart for the overall shape of the payoff.",
    ],
  },
  "pay-search": {
    title: "About product search",
    paragraphs: [
      "This tab helps you find one product quickly. Type a name, ISIN, series, or underlying and matching results appear in the dropdown and table.",
      "Selecting a product loads it into the main payoff screen so you can move straight from search to analysis.",
      "Results follow the same live or expired filter you set at the top of the page.",
      "After selecting, check the ISIN in the specifications panel when two product names look similar.",
    ],
  },

  // ---------------------------------------------------------------- Analytics
  "an-lifecycle": {
    title: "Lifecycle universe",
    paragraphs: [
      "This chart splits the book by status — ongoing, maturing soon, expired, and so on — and sizes each slice by the money in it, in crores. It is the big-picture view of where the portfolio stands.",
      "A large ongoing slice means most money is still invested. A large expired slice means much of the historical book has already paid out.",
      "The legend shows both the number of products and the rupee amount in each slice.",
      "Maturing within three months and one month are shown separately so near-term expiries are easy to spot.",
    ],
  },
  "an-coupon": {
    title: "Coupon distribution",
    paragraphs: [
      "Many structured products offer a headline return rate — the coupon. This chart groups products by coupon band and shows how much money sits in each band, in crores.",
      "It reveals whether the book is tilted toward lower, steadier returns or higher, more ambitious payoffs.",
      "Products with no stated coupon are grouped separately so they do not distort the picture.",
      "Bar heights reflect invested amount, not just the count of products — so a few large tickets show up at their true economic weight.",
    ],
  },
  "an-protection": {
    title: "Principal protection mix",
    paragraphs: [
      "Some products guarantee the client’s original capital back; others put capital at risk in exchange for higher potential returns. This chart shows how invested money divides between the two, in crores.",
      "It is a quick read on the overall risk character of the book — more protected money means a more conservative portfolio.",
      "Labels follow the exact wording from the product file so principal protected and non-protected deals are not mixed up.",
      "Any unclassified slice means the protection field was blank in the source data.",
    ],
  },
  "an-underlying": {
    title: "Underlying exposure",
    paragraphs: [
      "Every structured product is linked to an underlying — usually an index like Nifty or Sensex, or a single stock. This chart ranks underlyings by how much money is linked to each, in crores.",
      "It highlights concentration: if most of the book depends on one index, portfolio outcomes will move closely with that market.",
      "The layout keeps long index names readable on screen.",
      "The top ten underlyings by invested amount are shown so the chart stays clear and useful.",
    ],
  },
  "an-tenor": {
    title: "Tenor profile",
    paragraphs: [
      "Tenor is how long a product runs before maturity. This chart groups the book by length — under a year, one to two years, and so on — and shows the money in each group, in crores.",
      "A book weighted to short tenors returns cash to clients sooner. A book weighted to long tenors keeps money invested longer and is less sensitive to short-term market moves.",
      "Products without tenor information still count toward the Unknown group rather than disappearing from the chart.",
      "Read this alongside the maturity ladder on the home page for a full picture of timing and reinvestment.",
    ],
  },
  "an-radar": {
    title: "Category risk radar",
    paragraphs: [
      "These gauges summarise the book along several dimensions at once — size, average coupon, how much is listed, and issuer quality. They give a balanced scorecard rather than a single headline number.",
      "Read them together: high coupon with lower protection suggests a more ambitious profile; the opposite suggests a more conservative one.",
      "The risk score weighs issuer credibility, capital protection, tenor, and market linkage — structured products are designed with partial protection, so scores reflect that context.",
      "Figures beneath each gauge — credible issuer share, listed share, and average tenor — help explain the needle position in plain terms.",
    ],
  },
};
