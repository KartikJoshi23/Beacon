/**
 * verify.mjs — Independent verification harness for the finance engine.
 *
 * This does NOT trust the engine's own numbers. It:
 *   1. Re-computes anchor values by hand (year-1 OCF, initial, terminal).
 *   2. Cross-checks NPV with a second, independently written implementation.
 *   3. Asserts the fundamental identities every correct engine must satisfy.
 *   4. Prints the full metric suite for eyeballing against a spreadsheet.
 *
 * Run:  npm run verify   (or)   node scripts/verify.mjs
 * Exits non-zero if any check fails.
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
  npvBreakEvenUtilisation,
  incrementalBuildVsBuy,
  buyStandalone,
} from '../src/lib/finance.js';
import { BASE_CASE, CLOUD_ALTERNATIVE, SMALL_TIER, SCENARIO_BUNDLES } from '../src/data/prometheus.js';

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
const money = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const pct = (x) => (x == null ? 'n/a' : (x * 100).toFixed(2) + '%');
const yrs = (x) => (x == null ? 'never' : x.toFixed(2) + ' yrs');

// Second, independent NPV implementation (uses Math.pow, plain loop).
function npvIndependent(rate, cfs) {
  let acc = 0;
  for (let t = 0; t < cfs.length; t++) acc += cfs[t] * Math.pow(1 + rate, -t);
  return acc;
}

console.log('\n=== PROJECT PROMETHEUS — finance engine verification ===\n');

const proj = buildProject(BASE_CASE);
const m = computeMetrics(BASE_CASE);
const r = BASE_CASE.discountRate;

// ---------------------------------------------------------------
console.log('[1] Hand-computed anchors');
// Year 1 by hand
const soldY1 = 266_000 * 0.62; // 164,920
const revY1 = 4.0 * soldY1; // 659,680
const varY1 = 0.18 * soldY1; // 29,685.6
const depY1 = (1_280_000 + 70_000 + 40_000) / 5; // 278,000
const ebitY1 = revY1 - varY1 - 360_000 - 0 - depY1; // -8,005.6
const taxY1 = ebitY1 * 0.09; // -720.504 (loss offset)
const ocfY1Hand = ebitY1 - taxY1 + depY1; // 270,714.904
check('year-1 sold hours = 164,920', near(proj.rows[0].soldHours, soldY1));
check('year-1 revenue = $659,680', near(proj.rows[0].revenue, revY1));
check('year-1 depreciation = $278,000', near(proj.rows[0].depreciation, depY1));
check(`year-1 OCF = ${money(ocfY1Hand)} (hand)`, near(proj.rows[0].ocf, ocfY1Hand, 1e-9), `engine=${proj.rows[0].ocf}`);
check('initial outlay = -$1,530,000', near(proj.initial, -1_530_000));
const termHand = (179_200 - 0.09 * 179_200) + 140_000; // 163,072 + 140,000
check(`terminal add = ${money(termHand)} (hand)`, near(proj.terminalAdd, termHand), `engine=${proj.terminalAdd}`);

// ---------------------------------------------------------------
console.log('\n[2] Cross-check NPV against an independent implementation');
const npvA = npv(r, proj.cashflows);
const npvB = npvIndependent(r, proj.cashflows);
check(`engine NPV == independent NPV (${money(npvA)})`, near(npvA, npvB, 1e-9), `A=${npvA} B=${npvB}`);

// ---------------------------------------------------------------
console.log('\n[3] Fundamental identities');
const undiscounted = proj.cashflows.reduce((s, x) => s + x, 0);
check('NPV at rate 0 == sum of undiscounted cash flows', near(npv(0, proj.cashflows), undiscounted, 1e-6));
const irrV = irr(proj.cashflows);
// Tolerance is in currency units: IRR correct to the cent is more than sufficient.
// (Rate-space convergence of ~1e-9 floors the NPV residual near ~$1e-3 because
//  dNPV/dr at the root is on the order of millions.)
check(`NPV at IRR ~ 0 (IRR=${pct(irrV)})`, Math.abs(npv(irrV, proj.cashflows)) < 1e-2, `resid=${npv(irrV, proj.cashflows)}`);
const piV = profitabilityIndex(r, proj.cashflows);
check('PI == 1 + NPV/|CF0|', near(piV, 1 + npvA / Math.abs(proj.cashflows[0]), 1e-9));
check('discounted payback >= plain payback', m.discountedPayback >= m.payback, `disc=${m.discountedPayback} plain=${m.payback}`);
const reinvest = BASE_CASE.reinvestRate;
const mirrV = mirr(proj.cashflows, r, reinvest);
check('MIRR is between 0 and IRR for these ramped flows', mirrV > 0 && mirrV < irrV, `mirr=${mirrV} irr=${irrV}`);
// MIRR sanity: FV of positives compounded == (1+MIRR)^n * |PV negatives|
const n = proj.cashflows.length - 1;
let fvPos = 0, pvNeg = 0;
proj.cashflows.forEach((cf, t) => { if (cf < 0) pvNeg += cf / (1 + r) ** t; else fvPos += cf * (1 + reinvest) ** (n - t); });
check('MIRR reconstructs FV/PV relationship', near((-pvNeg) * (1 + mirrV) ** n, fvPos, 1e-6));

// ---------------------------------------------------------------
console.log('\n[4] Break-even internal consistency');
const be = npvBreakEvenUtilisation(BASE_CASE);
const scaled = { ...BASE_CASE, utilisation: BASE_CASE.utilisation.map((u) => u * be.factor) };
check('NPV at break-even utilisation ~ 0', Math.abs(npv(r, buildProject(scaled).cashflows)) < 1, `factor=${be.factor}`);

// ---------------------------------------------------------------
console.log('\n[5] Sensitivity monotonic sanity');
const sens = sensitivity(BASE_CASE, { pct: 0.2 });
const priceRow = sens.results.find((x) => x.driver === 'price');
check('higher price -> higher NPV (price driver positive)', priceRow.highNpv > priceRow.lowNpv);
const varRow = sens.results.find((x) => x.driver === 'varCostPerHour');
check('higher variable cost -> lower NPV', varRow.highNpv < varRow.lowNpv);

// ---------------------------------------------------------------
console.log('\n[6] Scenario ordering (worst < base < best)');
const sc = scenarioAnalysis(BASE_CASE, SCENARIO_BUNDLES);
check('worst NPV < base NPV < best NPV', sc.worst.npv < sc.base.npv && sc.base.npv < sc.best.npv,
  `worst=${sc.worst.npv} base=${sc.base.npv} best=${sc.best.npv}`);

// ---------------------------------------------------------------
console.log('\n[7] Incremental Build-vs-Buy sanity');
const inc = incrementalBuildVsBuy(BASE_CASE, CLOUD_ALTERNATIVE);
const buy = buyStandalone(BASE_CASE, CLOUD_ALTERNATIVE);
check('incremental cash flow vector has correct length', inc.cashflows.length === BASE_CASE.life + 1);
check('incremental t0 == build initial outlay', near(inc.cashflows[0], proj.initial));
check('reconciliation: Build NPV - Buy NPV == incremental NPV',
  near(m.npv - buy.npv, inc.npv, 1e-6), `build-buy=${m.npv - buy.npv} inc=${inc.npv}`);

// ---------------------------------------------------------------
// Results dashboard (for spreadsheet eyeballing)
// ---------------------------------------------------------------
console.log('\n=== BASE-CASE RESULTS (13 required outputs) ===');
console.log(`  1  Initial cash flow          ${money(m.initialCashFlow)}`);
console.log(`  2  Annual operating CFs        [${m.annualOperatingCashFlows.map((x) => money(x)).join(', ')}]`);
console.log(`  3  Terminal-year add           ${money(m.terminalCashFlow)}`);
console.log(`  4  Payback period              ${yrs(m.payback)}`);
console.log(`  5  Discounted payback          ${yrs(m.discountedPayback)}`);
console.log(`  6  ARR (avg investment)        ${pct(m.arr.onAverageInvestment)}   (on initial ${pct(m.arr.onInitialInvestment)})`);
console.log(`  7  NPV @ ${pct(r)}                 ${money(m.npv)}`);
console.log(`  8  IRR                         ${pct(m.irr)}`);
console.log(`  9  MIRR                        ${pct(m.mirr)}`);
console.log(` 10  Profitability Index         ${m.profitabilityIndex.toFixed(3)}`);
console.log(` 11  Break-even (accounting)     ${Math.round(m.breakEven.hours).toLocaleString('en-US')} GPU-hrs  (${pct(m.breakEven.utilisation)} of capacity)`);
console.log(`     Break-even (NPV=0, util.)   mean utilisation ${pct(be.meanUtilisationAtBE)}`);
console.log(' 12  Sensitivity (tornado, +/-20%, by swing):');
sens.results.forEach((s) => console.log(`        ${s.driver.padEnd(16)} swing ${money(s.swing)}  [low ${money(s.lowNpv)} .. high ${money(s.highNpv)}]`));
console.log(' 13  Scenarios:');
['worst', 'base', 'best'].forEach((k) => console.log(`        ${k.padEnd(6)} NPV ${money(sc[k].npv)}  IRR ${pct(sc[k].irr)}  PI ${sc[k].profitabilityIndex.toFixed(3)}`));

console.log('\n=== BUILD vs BUY ===');
const buildNpv = m.npv;
console.log(`     Build (on-prem) standalone NPV   ${money(buildNpv)}`);
console.log(`     Buy (cloud) standalone NPV       ${money(buy.npv)}`);
console.log(`     Incremental (Build - Buy) NPV    ${money(inc.npv)}  IRR ${pct(inc.irr)}  PI ${inc.profitabilityIndex.toFixed(3)}`);
const small = computeMetrics(SMALL_TIER);
console.log(`     Small tier (16-GPU) NPV          ${money(small.npv)}  IRR ${pct(small.irr)}`);

console.log(`\n=== ${failed === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} :  ${passed} passed, ${failed} failed ===\n`);
process.exit(failed === 0 ? 0 : 1);
