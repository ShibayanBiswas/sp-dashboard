/**
 * Formats master-sheet product explanations for desk display.
 * Excel often stores participation rates as 7500% meaning 75.00% (×100 in cell).
 * Desk copy avoids parenthetical asides — use em dashes for clarifications.
 */
export function formatProductExplanation(text: string): string {
  if (!text?.trim()) return text;

  let out = text.trim();

  // PR of 7600% (7500%+100%) → PR of 76.0% — 75.0% participation + 100% coupon
  out = out.replace(
    /PR of (\d{3,})%\s*\((\d{3,})%\+100%\)/gi,
    (_, total, part) => {
      const t = Number(total) / 100;
      const p = Number(part) / 100;
      return `PR of ${t.toFixed(1)}% — ${p.toFixed(1)}% participation + 100% coupon`;
    },
  );

  // Standalone 4+ digit percents in PR context → divide by 100
  out = out.replace(/\bPR of (\d{4,})%/gi, (_, n) => `PR of ${(Number(n) / 100).toFixed(1)}%`);

  // Upside/downside decay participation: 600% in Excel = 6.0% per 1% index move
  out = out.replace(
    /\b(upside decay of|downside,?)\s*(\d{3,})%/gi,
    (match, label, n) => {
      const num = Number(n);
      if (num >= 100) {
        const desk = (num / 100).toFixed(1);
        return `${label} ${desk}% per 1% index move`;
      }
      return match;
    },
  );

  // Generic "600% participation" prose (Portfolio Insurance style)
  out = out.replace(
    /\b(\d{3,})% participation\b/gi,
    (match, n) => {
      const num = Number(n);
      if (num >= 100) {
        const desk = (num / 100).toFixed(1);
        return `${desk}% participation — for every 1% index move → ${desk}% return`;
      }
      return match;
    },
  );

  // Range bands: 109% to 111% of Initial Nifty → +9% to +11% index move
  out = out.replace(
    /from (\d+(?:\.\d+)?)% to (\d+(?:\.\d+)?)% of Initial Nifty(?: Level)?/gi,
    (_, lo, hi) => {
      const moveLo = Number(lo) - 100;
      const moveHi = Number(hi) - 100;
      return `from ${lo}% to ${hi}% of initial fixing — +${moveLo.toFixed(1)}% to +${moveHi.toFixed(1)}% index move`;
    },
  );

  // Level references above/below thresholds
  out = out.replace(
    /above (\d+(?:\.\d+)?)% of Initial Nifty Level/gi,
    (_, pct) => {
      const move = Number(pct) - 100;
      return `above ${pct}% of initial fixing — +${move.toFixed(1)}% index move`;
    },
  );

  out = out.replace(
    /at or above (\d+(?:\.\d+)?)% of Initial Nifty Level/gi,
    (_, pct) => {
      const move = Number(pct) - 100;
      return `at or above ${pct}% of initial fixing — +${move.toFixed(1)}% index move`;
    },
  );

  // coupon of 4850% → coupon of 48.5%
  out = out.replace(/\bcoupon of (\d{3,})%/gi, (_, n) => `coupon of ${(Number(n) / 100).toFixed(1)}%`);

  // Remaining Excel-scale percents (4+ digits) → desk display
  out = out.replace(/\b(\d{4,})%/g, (_, n) => `${(Number(n) / 100).toFixed(1)}%`);
  out = out.replace(/(\d+\.\s[^2]+?)\s+2\.\s/g, "$1\n2. ");
  out = out.replace(/(\d+\.\s[^3]+?)\s+3\.\s/g, "$1\n3. ");
  out = out.replace(/(\d+\.\s[^4]+?)\s+4\.\s/g, "$1\n4. ");

  // Normalize level references: 132% of Initial → 132% of initial fixing — +32% move
  out = out.replace(
    /(\d+(?:\.\d+)?)% of Initial Nifty(?: Level)?/gi,
    (match, pct) => {
      const level = Number(pct);
      const move = level - 100;
      const moveLabel = move >= 0 ? `+${move.toFixed(1)}%` : `${move.toFixed(1)}%`;
      return `${pct}% of initial fixing — ${moveLabel} index move`;
    },
  );

  return out;
}

/** Human-readable formula PR tokens — 7500% → 75× participation. */
export function formatFormulaForDisplay(formula: string): string {
  if (!formula?.trim()) return formula;
  return formula.replace(/(\d{3,})%/g, (match, n) => {
    const num = Number(n);
    if (num >= 1000) return `${(num / 100).toFixed(1)}%`;
    return match;
  });
}

/**
 * Describes the active payoff band from index performance (for KPI subtitles).
 * Nifty Accelerator: flat 100% at/above 133% initial — 33% move.
 */
export function describePayoffBand(formula: string, z: number): string | undefined {
  if (!formula?.trim()) return undefined;
  const pct = z * 100;
  if (formula.includes("7500%") || formula.includes("32%")) {
    if (z >= 0.33) return "At/above 133% initial — +33% move — flat 100% coupon band";
    if (z >= 0.32 && z < 0.33) return "132–133% initial band — +32% to +33% move — accelerated PR";
    if (z >= 0.08) return "Above 108% initial — +8% move — 100% PR band";
  }
  return `Live index move ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs initial fixing`;
}
