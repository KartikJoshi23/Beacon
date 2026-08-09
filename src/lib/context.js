/**
 * context.js — build a compact, grounded text summary of the current analysis
 * to send to the AI Advisor backend as CONTEXT. Keeps the model factual.
 */
import { fmtMoney, fmtPct, fmtX, fmtYears } from './format.js';
import { COMPANY } from '../data/scenario.js';

export function buildAdvisorContext({ input, metrics, comparison, currentName }) {
  const m = metrics;
  const lines = [];
  lines.push(`Company: ${COMPANY.name} (${COMPANY.sector}, ${COMPANY.city}). Decision: ${COMPANY.decision}.`);
  lines.push(`Currency AED. Required return (WACC) ${fmtPct(input.discountRate)}. Project life ${input.life} years. Tax ${fmtPct(input.tax)}.`);
  lines.push(`Currently viewing: ${currentName}.`);
  lines.push('');
  lines.push('Key inputs for the current site:');
  lines.push(`- Initial investment ${fmtMoney(input.initialInvestment)}, install/transport ${fmtMoney(input.installTransport)}, working capital ${fmtMoney(input.workingCapital)}.`);
  lines.push(`- Year-1 revenue ${fmtMoney(input.revenueYear1)} growing ${fmtPct(input.revenueGrowth)}/yr; fixed cost ${fmtMoney(Array.isArray(input.fixedCost) ? input.fixedCost[0] : input.fixedCost)}/yr; variable cost ${fmtPct(input.variableCostPct)} of sales.`);
  lines.push(`- Salvage ${fmtMoney(input.salvage)}; straight-line depreciation.`);
  lines.push('');
  lines.push('Computed results for the current site (13 measures):');
  lines.push(`- Initial cash flow ${fmtMoney(m.initialCashFlow)}; terminal-year add ${fmtMoney(m.terminalCashFlow)}.`);
  lines.push(`- Annual operating cash flows: ${m.annualOperatingCashFlows.map((x) => fmtMoney(x)).join(', ')}.`);
  lines.push(`- NPV ${fmtMoney(m.npv)}; IRR ${fmtPct(m.irr)}; MIRR ${fmtPct(m.mirr)}; PI ${fmtX(m.profitabilityIndex)}.`);
  lines.push(`- Payback ${fmtYears(m.payback)}; discounted payback ${fmtYears(m.discountedPayback)}; ARR ${fmtPct(m.arr.onAverageInvestment)}.`);
  lines.push(`- Break-even revenue ${fmtMoney(m.breakEven.revenue)} (${fmtPct(m.breakEven.pctOfYear1)} of year-1 sales).`);
  lines.push('');
  if (comparison?.ranked?.length) {
    lines.push('All candidate sites, ranked by NPV (mutually exclusive — only one opens):');
    comparison.ranked.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.name} — NPV ${fmtMoney(r.metrics.npv)}, IRR ${fmtPct(r.metrics.irr)}, PI ${fmtX(r.metrics.profitabilityIndex)}, payback ${fmtYears(r.metrics.payback)}.`);
    });
    lines.push(`Best by NPV: ${comparison.best.name}.`);
  }
  return lines.join('\n');
}

export const SUGGESTED_QUESTIONS = [
  'Which site should we open and why?',
  'Why is the flagship the weakest despite the highest revenue?',
  'What single factor most threatens this investment?',
  'Explain NPV vs IRR for a non-finance manager.',
];
