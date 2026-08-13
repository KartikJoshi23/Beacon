/**
 * context.js — build grounded text summaries of the analysis to send to the
 * AI Advisor as CONTEXT. Two scopes:
 *   - buildAdvisorContext  : the whole model (all inputs, 13 metrics, ranking)
 *   - buildTabContext(tab)  : focused on the tab the user is currently viewing
 */
import { fmtMoney, fmtPct, fmtX, fmtYears } from './format.js';
import { COMPANY } from '../data/scenario.js';

const scalarFixed = (fc) => (Array.isArray(fc) ? fc[0] : fc);

const DRIVER_LABEL = {
  revenue: 'sales revenue',
  variableCostPct: 'variable-cost ratio',
  fixedCost: 'fixed costs (rent)',
  initialInvestment: 'fit-out capex',
  salvage: 'salvage value',
  discountRate: 'required return',
};

export const TAB_LABELS = {
  overview: 'Overview',
  inputs: 'Inputs & assumptions',
  results: 'Results (13 measures)',
  analysis: 'Analysis (sensitivity & scenarios)',
  alternatives: 'Alternatives comparison',
  ai: 'AI Insight',
};

export function summarizeSensitivity(sensitivity) {
  if (!sensitivity?.results) return '';
  return sensitivity.results
    .map((r) => `${DRIVER_LABEL[r.driver] || r.driver}: NPV swing ${fmtMoney(r.swing)} [${fmtMoney(r.lowNpv)} … ${fmtMoney(r.highNpv)}]`)
    .join('; ');
}

export function summarizeScenarios(scenarios) {
  if (!scenarios) return '';
  return ['worst', 'base', 'best']
    .map((k) => `${k}: NPV ${fmtMoney(scenarios[k].npv)}, IRR ${fmtPct(scenarios[k].irr)}, PI ${fmtX(scenarios[k].profitabilityIndex)}`)
    .join('; ');
}

export function buildAdvisorContext({ input, metrics, comparison, currentName }) {
  const m = metrics;
  const lines = [];
  lines.push(`Company: ${COMPANY.name} (${COMPANY.sector}, ${COMPANY.city}). Decision: ${COMPANY.decision}.`);
  lines.push(`Currency AED. Required return (WACC) ${fmtPct(input.discountRate)}. Project life ${input.life} years. Tax ${fmtPct(input.tax)}.`);
  lines.push(`Currently viewing site: ${currentName}.`);
  lines.push('');
  lines.push('Key inputs (current site):');
  lines.push(`- Initial investment ${fmtMoney(input.initialInvestment)}, install/transport ${fmtMoney(input.installTransport)}, working capital ${fmtMoney(input.workingCapital)}.`);
  lines.push(`- Year-1 revenue ${fmtMoney(input.revenueYear1)} growing ${fmtPct(input.revenueGrowth)}/yr; fixed cost ${fmtMoney(scalarFixed(input.fixedCost))}/yr; variable cost ${fmtPct(input.variableCostPct)} of sales.`);
  lines.push(`- Salvage ${fmtMoney(input.salvage)}; straight-line depreciation. Sunk cost ${fmtMoney(input.sunkCost)} is EXCLUDED (irrelevant).`);
  lines.push('');
  lines.push('Computed results (13 measures):');
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

/** Focused context for the tab the user is currently looking at. */
export function buildTabContext(tab, data) {
  const { input, metrics: m, comparison, sensitivity, scenarios, currentName, verdict } = data;
  const head = `The user is currently viewing the "${TAB_LABELS[tab] || tab}" tab. Focus your answer on what this view shows (you may add general finance reasoning).`;
  const base = `Company ${COMPANY.name}; decision: ${COMPANY.decision}. Currency AED. Required return ${fmtPct(input.discountRate)}. Current site: ${currentName}.`;
  let body = '';
  switch (tab) {
    case 'overview':
      body = `Headline verdict: ${verdict?.verdict}. ${verdict?.headline || ''} NPV ${fmtMoney(m.npv)}, IRR ${fmtPct(m.irr)}, PI ${fmtX(m.profitabilityIndex)}, payback ${fmtYears(m.payback)}.`;
      break;
    case 'inputs':
      body = `Assumptions on screen: initial investment ${fmtMoney(input.initialInvestment)}, install/transport ${fmtMoney(input.installTransport)}, working capital ${fmtMoney(input.workingCapital)}, life ${input.life}y, year-1 revenue ${fmtMoney(input.revenueYear1)} (+${fmtPct(input.revenueGrowth)}/yr), fixed cost ${fmtMoney(scalarFixed(input.fixedCost))}/yr (+${fmtPct(input.fixedGrowth)}/yr), variable ${fmtPct(input.variableCostPct)} of sales, salvage ${fmtMoney(input.salvage)}, tax ${fmtPct(input.tax)}, sunk cost ${fmtMoney(input.sunkCost)}. Note: sunk cost is EXCLUDED so it never changes results; the reinvestment rate only affects MIRR.`;
      break;
    case 'results':
      body = `The 13 measures for ${currentName}: initial CF ${fmtMoney(m.initialCashFlow)}, terminal ${fmtMoney(m.terminalCashFlow)}, OCFs [${m.annualOperatingCashFlows.map((x) => fmtMoney(x)).join(', ')}], NPV ${fmtMoney(m.npv)}, IRR ${fmtPct(m.irr)}, MIRR ${fmtPct(m.mirr)}, PI ${fmtX(m.profitabilityIndex)}, payback ${fmtYears(m.payback)}, disc. payback ${fmtYears(m.discountedPayback)}, ARR ${fmtPct(m.arr.onAverageInvestment)}, break-even revenue ${fmtMoney(m.breakEven.revenue)} (${fmtPct(m.breakEven.pctOfYear1)} of year-1 sales).`;
      break;
    case 'analysis':
      body = `Sensitivity (±20% NPV swings, largest first): ${summarizeSensitivity(sensitivity)}. Scenarios: ${summarizeScenarios(scenarios)}. IRR ${fmtPct(m.irr)} vs hurdle ${fmtPct(input.discountRate)}; MIRR ${fmtPct(m.mirr)}.`;
      break;
    case 'alternatives':
      body = comparison?.ranked?.length
        ? 'Ranking by NPV (mutually exclusive — only one branch opens): ' +
          comparison.ranked.map((r, i) => `${i + 1}. ${r.name} NPV ${fmtMoney(r.metrics.npv)}, IRR ${fmtPct(r.metrics.irr)}, PI ${fmtX(r.metrics.profitabilityIndex)}, payback ${fmtYears(r.metrics.payback)}`).join('; ') +
          `. Best: ${comparison.best.name}.`
        : '';
      break;
    case 'ai':
    default:
      return buildAdvisorContext(data);
  }
  return `${head}\n${base}\n${body}`;
}

export const SUGGESTED_QUESTIONS = [
  'Which site should we open and why?',
  'What most threatens this investment?',
  'Explain this like I’m not a finance person.',
];
