/**
 * verify.mjs — Independent verification harness for the finance engine.
 * Re-derives anchors by hand, cross-checks NPV with a second implementation,
 * asserts the fundamental identities, and prints the full metric suite.
 * Run:  npm run verify
 */
import {
  buildProject,
  computeMetrics,
  npv,
  irr,
  mirr,
  profitabilityIndex,
  sensitivity,
  scenarioAnalysis,
  npvBreakEvenRevenue,
  compareAlternatives,
} from '../src/lib/finance.js';
import { BASE_CASE, ALTERNATIVES, SCENARIO_BUNDLES, CURRENCY } from '../src/data/scenario.js';

let passed = 0;
let failed = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}  ${detail}`);
  }
}
const money = (x) =>
  x == null ? 'n/a' : x.toLocaleString('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(2) + '%');
const yrs = (x) => (x == null ? 'never' : x.toFixed(2) + ' yrs');

function npvIndependent(rate, cfs) {
  let acc = 0;
  for (let t = 0; t < cfs.length; t++) acc += cfs[t] * Math.pow(1 + rate, -t);
  return acc;
}

console.log('\n=== PROJECT BEACON — finance engine verification ===\n');

const proj = buildProject(BASE_CASE);
const m = computeMetrics(BASE_CASE);
const r = BASE_CASE.discountRate;

console.log('[1] Hand-computed anchors (Location A)');
const depHand = (1_200_000 + 180_000 - 180_000) / 6; // to salvage -> 200,000
const revY1 = 2_900_000;
const varY1 = 0.36 * revY1; // 1,044,000
const fixedY1 = 1_550_000;
const ebitY1 = revY1 - varY1 - fixedY1 - 0 - depHand; // 106,000
const ocfY1Hand = ebitY1 - ebitY1 * 0.09 + depHand; // 296,460
check('year-1 revenue = AED 2,900,000', near(proj.rows[0].revenue, revY1));
check('annual depreciation = AED 200,000 (SL to salvage)', near(proj.dep[0], depHand));
check(`year-1 OCF = ${money(ocfY1Hand)} (hand)`, near(proj.rows[0].ocf, ocfY1Hand, 1e-9), `engine=${proj.rows[0].ocf}`);
check('initial outlay = -AED 1,530,000', near(proj.initial, -1_530_000));
const termHand = 180_000 - 0.09 * (180_000 - 180_000) + 150_000; // 330,000 (book=salvage, no tax)
check(`terminal add = ${money(termHand)} (hand)`, near(proj.terminalAdd, termHand), `engine=${proj.terminalAdd}`);
check('revenue grows 6%/yr', near(proj.rows[1].revenue, revY1 * 1.06));

console.log('\n[2] Cross-check NPV against an independent implementation');
const npvA = npv(r, proj.cashflows);
check(`engine NPV == independent NPV (${money(npvA)})`, near(npvA, npvIndependent(r, proj.cashflows), 1e-9));

console.log('\n[3] Fundamental identities');
const undiscounted = proj.cashflows.reduce((s, x) => s + x, 0);
check('NPV at rate 0 == sum of undiscounted cash flows', near(npv(0, proj.cashflows), undiscounted, 1e-6));
const irrV = irr(proj.cashflows);
check(`NPV at IRR ~ 0 (IRR=${pct(irrV)})`, Math.abs(npv(irrV, proj.cashflows)) < 1e-2, `resid=${npv(irrV, proj.cashflows)}`);
check('PI == 1 + NPV/|CF0|', near(m.profitabilityIndex, 1 + npvA / Math.abs(proj.cashflows[0]), 1e-9));
check('discounted payback >= plain payback', m.discountedPayback >= m.payback, `disc=${m.discountedPayback} plain=${m.payback}`);
const mirrV = mirr(proj.cashflows, r, BASE_CASE.reinvestRate);
check('MIRR between 0 and IRR', mirrV > 0 && mirrV < irrV, `mirr=${mirrV} irr=${irrV}`);

console.log('\n[4] Break-even internal consistency');
const be = npvBreakEvenRevenue(BASE_CASE);
const scaled = { ...BASE_CASE, revenueYear1: BASE_CASE.revenueYear1 * be.factor };
check('NPV at break-even revenue ~ 0', Math.abs(npv(r, buildProject(scaled).cashflows)) < 1, `factor=${be.factor}`);
check('accounting break-even uses contribution ratio', near(m.breakEven.contributionRatio, 1 - BASE_CASE.variableCostPct));

console.log('\n[5] Sensitivity monotonic sanity');
const sens = sensitivity(BASE_CASE, { pct: 0.2 });
const revRow = sens.results.find((x) => x.driver === 'revenue');
check('higher revenue -> higher NPV', revRow.highNpv > revRow.lowNpv);
const vcRow = sens.results.find((x) => x.driver === 'variableCostPct');
check('higher variable cost % -> lower NPV', vcRow.highNpv < vcRow.lowNpv);

console.log('\n[6] Scenario ordering (worst < base < best)');
const sc = scenarioAnalysis(BASE_CASE, SCENARIO_BUNDLES);
check('worst < base < best', sc.worst.npv < sc.base.npv && sc.base.npv < sc.best.npv, `${sc.worst.npv} ${sc.base.npv} ${sc.best.npv}`);

console.log('\n[7] Alternatives comparison');
const cmp = compareAlternatives(ALTERNATIVES);
check('ranking is sorted by NPV descending', cmp.ranked.every((row, i, a) => i === 0 || a[i - 1].metrics.npv >= row.metrics.npv));
check('every alternative computes a finite NPV', cmp.rows.every((row) => Number.isFinite(row.metrics.npv)));

// ---------------- Results dashboard ----------------
console.log('\n=== LOCATION A — BASE-CASE RESULTS (13 required outputs) ===');
console.log(`  1  Initial cash flow          ${money(m.initialCashFlow)}`);
console.log(`  2  Annual operating CFs        [${m.annualOperatingCashFlows.map((x) => money(x)).join(', ')}]`);
console.log(`  3  Terminal-year add           ${money(m.terminalCashFlow)}`);
console.log(`  4  Payback period              ${yrs(m.payback)}`);
console.log(`  5  Discounted payback          ${yrs(m.discountedPayback)}`);
console.log(`  6  ARR (avg investment)        ${pct(m.arr.onAverageInvestment)}`);
console.log(`  7  NPV @ ${pct(r)}                 ${money(m.npv)}`);
console.log(`  8  IRR                         ${pct(m.irr)}`);
console.log(`  9  MIRR                        ${pct(m.mirr)}`);
console.log(` 10  Profitability Index         ${m.profitabilityIndex.toFixed(3)}`);
console.log(` 11  Break-even revenue (yr1)    ${money(m.breakEven.revenue)}  (${pct(m.breakEven.pctOfYear1)} of yr-1 sales)`);
console.log(` 12  Sensitivity (+/-20%, by swing):`);
sens.results.forEach((s) => console.log(`        ${s.driver.padEnd(17)} swing ${money(s.swing)}  [${money(s.lowNpv)} .. ${money(s.highNpv)}]`));
console.log(` 13  Scenarios:`);
['worst', 'base', 'best'].forEach((k) => console.log(`        ${k.padEnd(6)} NPV ${money(sc[k].npv)}  IRR ${pct(sc[k].irr)}  PI ${sc[k].profitabilityIndex.toFixed(2)}`));

console.log('\n=== ALTERNATIVES (ranked by NPV) ===');
cmp.ranked.forEach((row, i) =>
  console.log(
    `  ${i + 1}. ${row.name.padEnd(28)} NPV ${money(row.metrics.npv)}  IRR ${pct(row.metrics.irr)}  PI ${row.metrics.profitabilityIndex.toFixed(2)}  payback ${yrs(row.metrics.payback)}`
  )
);
console.log(`  => Best by NPV: ${cmp.best.name}`);

console.log(`\n=== ${failed === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} :  ${passed} passed, ${failed} failed ===\n`);
process.exit(failed === 0 ? 0 : 1);
