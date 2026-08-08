/**
 * insight.js — Deterministic, rules-based insight generator.
 * Produces the same structured shape a live LLM endpoint would return, so the
 * AI Advisor works fully offline and for free. A live model (if configured)
 * replaces this; this stays the guaranteed fallback.
 */
import { fmtMoney, fmtMoneyCompact, fmtPct, fmtYears, fmtX } from './format.js';

const DRIVER_LABEL = {
  revenue: 'sales revenue',
  variableCostPct: 'variable-cost ratio (COGS)',
  fixedCost: 'fixed costs (rent & payroll)',
  initialInvestment: 'fit-out capex',
  salvage: 'salvage value',
  discountRate: 'required return',
};

export function generateInsight({ metrics, comparison, sensitivity, input, verdict, currentName }) {
  const wacc = input.discountRate;
  const life = input.life;
  const m = metrics;
  const top = sensitivity.results.slice(0, 2);
  const topNames = top.map((r) => DRIVER_LABEL[r.driver] || r.driver);
  const best = comparison?.best;
  const bePct = m.breakEven?.pctOfYear1;

  const explanation = [
    `Opening ${currentName} needs ${fmtMoney(-m.initialCashFlow)} up front (fit-out, setup and working capital). Over ${life} years it returns a net present value of ${fmtMoney(
      m.npv
    )} at a ${fmtPct(wacc)} required return — so it ${m.npv >= 0 ? 'adds' : 'loses'} value in today's money.`,
    `Its internal rate of return is ${fmtPct(m.irr)} (${
      m.irr > wacc ? 'above' : 'below'
    } the ${fmtPct(wacc)} hurdle) and the more conservative MIRR is ${fmtPct(
      m.mirr
    )}. The outlay is recovered in ${fmtYears(m.payback)} (${fmtYears(
      m.discountedPayback
    )} after discounting), and every dirham invested returns ${fmtX(m.profitabilityIndex)} in present value.`,
    `The result is most sensitive to ${topNames[0]} and ${topNames[1]}. Accounting break-even sits at ${fmtPct(
      bePct
    )} of year-one sales — ${bePct > 0.9 ? 'a thin margin of safety' : 'a comfortable cushion'}.`,
  ];

  const revRow = sensitivity.results.find((r) => r.driver === 'revenue');
  const fcRow = sensitivity.results.find((r) => r.driver === 'fixedCost');

  const risks = {
    financial: [
      `Footfall / sales risk — the single biggest driver: a 20% revenue shortfall swings NPV by about ${fmtMoneyCompact(
        Math.abs(revRow?.swing ?? 0)
      )}, enough to erase the case.`,
      `Rent & wage escalation — high operating leverage; a 20% rise in fixed costs moves NPV by ~${fmtMoneyCompact(
        Math.abs(fcRow?.swing ?? 0)
      )}, and break-even is already ${fmtPct(bePct)} of sales.`,
      `Input-cost inflation — coffee, dairy and packaging lift the variable-cost ratio and compress the contribution margin.`,
      `Capex overrun — fit-out costs frequently exceed budget, directly reducing NPV and lengthening payback.`,
    ],
    nonFinancial: [
      'Location & lease risk — footfall depends on the site; unfavourable lease renewal terms can undo the economics.',
      'Competitive saturation — Dubai’s café market is crowded; differentiation and service consistency are essential.',
      'Staffing & quality — recruiting and retaining trained baristas underpins the revenue forecast.',
      'Delivery-platform dependence — for the cloud-kitchen option, aggregator commission changes hit margins directly.',
    ],
  };

  const alternatives = (comparison?.ranked ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    npv: row.metrics.npv,
    irr: row.metrics.irr,
    note:
      i === 0
        ? `Best by NPV (${fmtMoney(row.metrics.npv)}, IRR ${fmtPct(row.metrics.irr)}). The value-maximising choice.`
        : `NPV ${fmtMoney(row.metrics.npv)}, IRR ${fmtPct(row.metrics.irr)}.`,
  }));

  const recommendation = {
    verdict: verdict.verdict,
    text:
      best && best.name !== currentName
        ? `Recommendation: ${verdict.verdict}. All shortlisted outlets clear the ${fmtPct(
            wacc
          )} hurdle, but they are mutually exclusive — only one branch opens. On NPV, the value-maximising choice is ${best.name} (${fmtMoney(
            best.metrics.npv
          )}), ahead of ${currentName} (${fmtMoney(
            m.npv
          )}). Prefer ${best.name} unless strategic factors (brand visibility of the flagship) justify the lower return.`
        : `Recommendation: ${verdict.verdict}. ${verdict.headline} ${verdict.reasons.join(' ')}`,
  };

  return { explanation, risks, alternatives, recommendation, meta: { source: 'Deterministic engine (offline)' } };
}
