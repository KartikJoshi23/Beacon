/**
 * verdict.js — Deterministic decision logic for the loaded project.
 * Accept / Reject / Delay / Review Further, aware that the branches are
 * mutually exclusive (only one opens), so a better-ranked alternative
 * downgrades an otherwise-acceptable project to "Review Further".
 */
import { fmtMoney, fmtPct } from './format.js';

export function deriveVerdict({ metrics, best, wacc, life, currentName }) {
  const { npv, irr, profitabilityIndex: pi, discountedPayback } = metrics;
  const healthy = npv > 0 && irr > wacc && pi > 1;
  const recovers = discountedPayback != null && discountedPayback <= life;
  const beatenBy =
    best && best.metrics && best.name !== currentName && best.metrics.npv > npv * 1.05 ? best : null;
  const marginal = irr - wacc < 0.02 || (npv > 0 && npv < 0.06 * Math.abs(metrics.initialCashFlow));

  let verdict, tone, accent, headline, reasons;

  if (npv <= 0 || irr < wacc) {
    verdict = 'Reject';
    tone = 'neg';
    accent = 'var(--magenta)';
    headline = 'This outlet destroys value on its own merits.';
    reasons = [
      `NPV is ${fmtMoney(npv)} and IRR (${fmtPct(irr)}) sits below the ${fmtPct(wacc)} hurdle.`,
      'Capital would be better deployed elsewhere unless the assumptions change materially.',
    ];
  } else if (beatenBy) {
    verdict = 'Review Further';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = `Profitable — but ${beatenBy.name} creates more value.`;
    reasons = [
      `${currentName} clears the hurdle (NPV ${fmtMoney(npv)}, IRR ${fmtPct(irr)}, PI ${pi.toFixed(2)}).`,
      `Since only one branch will open, the higher-NPV option — ${beatenBy.name} at ${fmtMoney(
        beatenBy.metrics.npv
      )} — should be preferred.`,
    ];
  } else if (marginal) {
    verdict = 'Delay';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = 'A knife-edge decision — wait for firmer inputs.';
    reasons = [
      `Returns hover around the hurdle (NPV ${fmtMoney(npv)}, IRR ${fmtPct(irr)} vs ${fmtPct(wacc)}).`,
      'Firm up the revenue forecast or negotiate rent before committing.',
    ];
  } else if (healthy && recovers) {
    verdict = 'Accept';
    tone = 'pos';
    accent = 'var(--emerald)';
    headline = 'The strongest use of capital among the options.';
    reasons = [
      `Positive NPV (${fmtMoney(npv)}), IRR (${fmtPct(irr)}) above the ${fmtPct(wacc)} hurdle, PI > 1.`,
      'It also leads the alternatives on value created.',
    ];
  } else {
    verdict = 'Review Further';
    tone = 'warn';
    accent = 'var(--amber)';
    headline = 'Mixed signals — dig deeper before deciding.';
    reasons = [`NPV ${fmtMoney(npv)}, IRR ${fmtPct(irr)} vs hurdle ${fmtPct(wacc)}.`];
  }

  return { verdict, tone, accent, headline, reasons, beatenBy };
}
