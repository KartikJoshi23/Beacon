/**
 * verdict.js — Deterministic decision logic.
 * Produces the headline Accept / Reject / Delay / Review Further verdict from
 * the computed metrics. This is a transparent, rule-based baseline; the Claude
 * layer later adds narrative reasoning on top of (and is evaluated against) it.
 */

export function deriveVerdict({ metrics, incremental, wacc, life }) {
  const { npv, irr, profitabilityIndex: pi, discountedPayback } = metrics;
  const incNpv = incremental?.npv ?? null;

  const standaloneHealthy = npv > 0 && irr > wacc && pi > 1;
  const recoversInLife = discountedPayback != null && discountedPayback <= life;
  const marginal = Math.abs(irr - wacc) < 0.02 || (npv > 0 && npv < 0.06 * Math.abs(metrics.initialCashFlow));
  const incrementalUnfavorable = incNpv != null && incNpv < 0;

  let verdict, tone, accent, headline, reasons;

  if (!standaloneHealthy && npv < 0) {
    verdict = 'Reject';
    tone = 'neg';
    accent = 'var(--magenta)';
    headline = 'The project destroys value on its own merits.';
    reasons = [
      `NPV is negative (${fmt(npv)}) and IRR (${pct(irr)}) sits below the ${pct(wacc)} hurdle.`,
      'Capital is better deployed elsewhere unless the inputs are fundamentally revised.',
    ];
  } else if (standaloneHealthy && !incrementalUnfavorable && recoversInLife && !marginal) {
    verdict = 'Accept';
    tone = 'pos';
    accent = 'var(--emerald)';
    headline = 'Building clears every hurdle and beats the alternative.';
    reasons = [
      `Positive NPV (${fmt(npv)}), IRR (${pct(irr)}) above the ${pct(wacc)} cost of capital, PI > 1.`,
      'It also wins on an incremental basis versus renting cloud capacity.',
    ];
  } else if (standaloneHealthy && incrementalUnfavorable) {
    verdict = 'Review Further';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = 'Profitable in isolation — but renting narrowly wins.';
    reasons = [
      `Standalone NPV is positive (${fmt(npv)}, IRR ${pct(irr)}), yet the incremental Build−Buy NPV is ${fmt(
        incNpv
      )}.`,
      'The capex is not justified purely by savings over cloud; renegotiate hardware price or lock in utilisation before committing.',
    ];
  } else if (marginal) {
    verdict = 'Delay';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = 'A knife-edge decision — wait for better inputs.';
    reasons = [
      `Returns hover around the hurdle (NPV ${fmt(npv)}, IRR ${pct(irr)} vs ${pct(wacc)}).`,
      'Delay until GPU prices soften or demand (utilisation) is contractually firmer.',
    ];
  } else {
    verdict = 'Review Further';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = 'Mixed signals — dig deeper before deciding.';
    reasons = [`NPV ${fmt(npv)}, IRR ${pct(irr)} vs hurdle ${pct(wacc)}.`];
  }

  return { verdict, tone, accent, headline, reasons };
}

const fmt = (x) =>
  x == null
    ? '—'
    : x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%');
