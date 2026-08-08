/**
 * finance.js — Capital-budgeting engine for Project PROMETHEUS
 * ------------------------------------------------------------------
 * Pure, dependency-free, deterministic functions. Currency-agnostic.
 * Convention: a "cashflows" array is indexed by year, cashflows[0] is the
 * time-0 outlay (already negative). All rates are decimals (0.13 = 13%).
 *
 * Every formula here is the textbook corporate-finance definition; the
 * companion harness scripts/verify.mjs proves them against hand-computed
 * anchors and internal identities.
 */

// ------------------------------------------------------------------
// Small numeric helpers
// ------------------------------------------------------------------
const sum = (a) => a.reduce((s, x) => s + x, 0);
const round = (x, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((x + Number.EPSILON) * f) / f;
};

// ------------------------------------------------------------------
// Core time-value primitives
// ------------------------------------------------------------------

/** Net Present Value including the t0 outlay. cashflows[0] is time 0. */
export function npv(rate, cashflows) {
  return cashflows.reduce((acc, cf, t) => acc + cf / (1 + rate) ** t, 0);
}

/**
 * Internal Rate of Return via robust bracketing + bisection.
 * Returns null when no sign change exists in [-0.9999, 100].
 */
export function irr(cashflows, { lo = -0.9999, hi = 100, tol = 1e-9, maxIter = 500 } = {}) {
  const f = (r) => npv(r, cashflows);
  let a = lo;
  let b = hi;
  let fa = f(a);
  let fb = f(b);
  // Scan for a sign change if the wide bracket doesn't straddle a root.
  if (fa * fb > 0) {
    let prevR = lo;
    let prevF = fa;
    let found = false;
    for (let r = lo + 0.01; r <= hi; r += 0.01) {
      const fr = f(r);
      if (prevF * fr <= 0) {
        a = prevR;
        b = r;
        fa = prevF;
        fb = fr;
        found = true;
        break;
      }
      prevR = r;
      prevF = fr;
    }
    if (!found) return null;
  }
  let mid = a;
  for (let i = 0; i < maxIter; i++) {
    mid = (a + b) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return mid;
    if (fa * fm < 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return mid;
}

/**
 * Modified IRR. Negative flows discounted to t0 at financeRate; positive
 * flows compounded to tN at reinvestRate. n = number of periods (years).
 */
export function mirr(cashflows, financeRate, reinvestRate) {
  const n = cashflows.length - 1;
  let pvNeg = 0;
  let fvPos = 0;
  cashflows.forEach((cf, t) => {
    if (cf < 0) pvNeg += cf / (1 + financeRate) ** t;
    else fvPos += cf * (1 + reinvestRate) ** (n - t);
  });
  if (pvNeg === 0) return null;
  return (fvPos / -pvNeg) ** (1 / n) - 1;
}

/** Profitability Index = PV(future inflows) / |initial outlay|. */
export function profitabilityIndex(rate, cashflows) {
  const initial = -cashflows[0];
  if (initial === 0) return null;
  const pvInflows = npv(rate, cashflows) - cashflows[0]; // = NPV + |CF0|
  return pvInflows / initial;
}

/** Undiscounted payback period with linear interpolation within the year. */
export function paybackPeriod(cashflows) {
  let cumulative = cashflows[0];
  for (let t = 1; t < cashflows.length; t++) {
    const prev = cumulative;
    cumulative += cashflows[t];
    if (cumulative >= 0) {
      const fraction = cashflows[t] === 0 ? 0 : -prev / cashflows[t];
      return t - 1 + fraction;
    }
  }
  return null; // never recovers
}

/** Discounted payback period (interpolated) at the given discount rate. */
export function discountedPayback(rate, cashflows) {
  const disc = cashflows.map((cf, t) => cf / (1 + rate) ** t);
  return paybackPeriod(disc);
}

/**
 * Accounting Rate of Return.
 * primary  = average annual after-tax profit / average investment
 * average investment = (depreciable base + salvage) / 2
 * Also returns the initial-investment variant for transparency.
 */
export function arr({ afterTaxProfits, depreciableBase, salvage }) {
  const avgProfit = sum(afterTaxProfits) / afterTaxProfits.length;
  const avgInvestment = (depreciableBase + salvage) / 2;
  return {
    onAverageInvestment: avgInvestment === 0 ? null : avgProfit / avgInvestment,
    onInitialInvestment: depreciableBase === 0 ? null : avgProfit / depreciableBase,
    avgProfit,
    avgInvestment,
  };
}

// ------------------------------------------------------------------
// Depreciation
// ------------------------------------------------------------------

/** Straight-line schedule. To zero by default (tax convention), or to salvage. */
export function straightLineDepreciation({ depreciableBase, life, salvage = 0, toSalvage = false }) {
  const target = toSalvage ? salvage : 0;
  const annual = (depreciableBase - target) / life;
  return Array.from({ length: life }, () => annual);
}

// ------------------------------------------------------------------
// Full project builder (PROMETHEUS operating model)
// ------------------------------------------------------------------

/**
 * Build the complete year-by-year schedule and net cash-flow vector for a
 * capacity/utilisation-driven project.
 *
 * Revenue_t   = price * capacityHours * utilisation_t
 * Variable_t  = varCostPerHour * capacityHours * utilisation_t
 * EBIT_t      = Revenue_t - Variable_t - fixed_t - opportunity_t - dep_t
 * Tax_t       = EBIT_t * tax        (symmetric loss offset when enabled)
 * OCF_t       = EBIT_t - Tax_t + dep_t
 *
 * Initial (t0) = -(equipment + installation + transportation + workingCapital)
 * Terminal add (tN) = [salvage - tax*(salvage - bookEnd)] + workingCapital
 */
export function buildProject(input) {
  const {
    equipment,
    installation = 0,
    transportation = 0,
    workingCapital = 0,
    life,
    price,
    capacityHours,
    utilisation, // array length = life
    varCostPerHour,
    fixedCost, // scalar or array
    tax,
    salvage = 0,
    discountRate,
    depreciateToSalvage = false,
    opportunityCostAnnual = 0,
    taxLossOffset = true,
    sunkCost = 0, // stored for display; intentionally EXCLUDED from cash flows
  } = input;

  const fixedArr = Array.isArray(fixedCost)
    ? fixedCost
    : Array.from({ length: life }, () => fixedCost);
  const utilArr = Array.isArray(utilisation)
    ? utilisation
    : Array.from({ length: life }, () => utilisation);

  const depreciableBase = equipment + installation + transportation;
  const dep = straightLineDepreciation({
    depreciableBase,
    life,
    salvage,
    toSalvage: depreciateToSalvage,
  });
  const bookEnd = depreciateToSalvage ? salvage : 0;

  const rows = [];
  const afterTaxProfits = [];
  for (let i = 0; i < life; i++) {
    const soldHours = capacityHours * utilArr[i];
    const revenue = price * soldHours;
    const variable = varCostPerHour * soldHours;
    const fixed = fixedArr[i];
    const opp = opportunityCostAnnual;
    const ebit = revenue - variable - fixed - opp - dep[i];
    const taxable = taxLossOffset ? ebit : Math.max(0, ebit);
    const taxAmt = taxable * tax;
    const nopat = ebit - taxAmt;
    const ocf = nopat + dep[i];
    afterTaxProfits.push(nopat);
    rows.push({
      year: i + 1,
      soldHours,
      revenue,
      variable,
      fixed,
      opportunity: opp,
      depreciation: dep[i],
      ebit,
      tax: taxAmt,
      nopat,
      ocf,
    });
  }

  const initial = -(equipment + installation + transportation + workingCapital);
  const afterTaxSalvage = salvage - tax * (salvage - bookEnd);
  const terminalAdd = afterTaxSalvage + workingCapital; // WC fully recovered

  // Net cash-flow vector (t0..tN)
  const cashflows = [initial];
  rows.forEach((r) => cashflows.push(r.ocf));
  cashflows[life] += terminalAdd;

  return {
    input,
    depreciableBase,
    dep,
    rows,
    afterTaxProfits,
    initial,
    afterTaxSalvage,
    workingCapitalRecovery: workingCapital,
    terminalAdd,
    cashflows,
  };
}

// ------------------------------------------------------------------
// Metric suite (all 13 outputs, assembled)
// ------------------------------------------------------------------

export function computeMetrics(input) {
  const project = buildProject(input);
  const { cashflows, rows, afterTaxProfits, depreciableBase, initial } = project;
  const rate = input.discountRate;

  const npvValue = npv(rate, cashflows);
  const irrValue = irr(cashflows);
  const reinvest = input.reinvestRate ?? rate;
  const mirrValue = mirr(cashflows, rate, reinvest);
  const pi = profitabilityIndex(rate, cashflows);
  const payback = paybackPeriod(cashflows);
  const discPayback = discountedPayback(rate, cashflows);
  const arrValue = arr({
    afterTaxProfits,
    depreciableBase,
    salvage: input.salvage ?? 0,
  });

  // Accounting break-even (GPU-hours) using year-1 fixed + depreciation:
  const contributionPerHour = input.price - input.varCostPerHour;
  const beHours =
    contributionPerHour <= 0
      ? null
      : (rows[0].fixed + project.dep[0]) / contributionPerHour;
  const beUtilisation = beHours == null ? null : beHours / input.capacityHours;

  return {
    project,
    initialCashFlow: initial,
    annualOperatingCashFlows: rows.map((r) => r.ocf),
    terminalCashFlow: project.terminalAdd,
    payback,
    discountedPayback: discPayback,
    arr: arrValue,
    npv: npvValue,
    irr: irrValue,
    mirr: mirrValue,
    profitabilityIndex: pi,
    breakEven: { hours: beHours, utilisation: beUtilisation, contributionPerHour },
    cashflows,
  };
}

// ------------------------------------------------------------------
// Break-even on NPV: solve for the utilisation multiplier where NPV = 0
// ------------------------------------------------------------------

/**
 * Scales every year's utilisation by a factor k and finds the k where NPV=0.
 * Returns { factor, utilisationAtBE } or null if no root in [0, 5].
 */
export function npvBreakEvenUtilisation(input) {
  const baseUtil = Array.isArray(input.utilisation)
    ? input.utilisation
    : Array.from({ length: input.life }, () => input.utilisation);
  const npvAtFactor = (k) => {
    const scaled = { ...input, utilisation: baseUtil.map((u) => u * k) };
    return npv(input.discountRate, buildProject(scaled).cashflows);
  };
  let a = 0;
  let b = 5;
  let fa = npvAtFactor(a);
  let fb = npvAtFactor(b);
  if (fa * fb > 0) return null;
  let mid = a;
  for (let i = 0; i < 300; i++) {
    mid = (a + b) / 2;
    const fm = npvAtFactor(mid);
    if (Math.abs(fm) < 1e-6 || (b - a) / 2 < 1e-9) break;
    if (fa * fm < 0) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return {
    factor: mid,
    utilisationAtBE: baseUtil.map((u) => u * mid),
    meanUtilisationAtBE: (sum(baseUtil) / baseUtil.length) * mid,
  };
}

// ------------------------------------------------------------------
// Sensitivity (one-at-a-time) -> tornado data
// ------------------------------------------------------------------

const DRIVER_SETTERS = {
  price: (inp, v) => ({ ...inp, price: v }),
  utilisation: (inp, v) => ({
    ...inp,
    utilisation: (Array.isArray(inp.utilisation)
      ? inp.utilisation
      : Array.from({ length: inp.life }, () => inp.utilisation)
    ).map((u) => u * v),
  }),
  varCostPerHour: (inp, v) => ({ ...inp, varCostPerHour: v }),
  fixedCost: (inp, v) => ({
    ...inp,
    fixedCost: (Array.isArray(inp.fixedCost)
      ? inp.fixedCost
      : Array.from({ length: inp.life }, () => inp.fixedCost)
    ).map((f) => f * v),
  }),
  equipment: (inp, v) => ({ ...inp, equipment: v }),
  discountRate: (inp, v) => ({ ...inp, discountRate: v }),
};

/**
 * For each driver, shift by ±pct and record resulting NPV.
 * `utilisation` and `fixedCost` are shifted multiplicatively (factor),
 * others by scaling their base scalar value.
 */
export function sensitivity(input, { pct = 0.2, drivers = Object.keys(DRIVER_SETTERS) } = {}) {
  const baseNpv = npv(input.discountRate, buildProject(input).cashflows);
  const results = drivers.map((driver) => {
    let lowInput;
    let highInput;
    if (driver === 'utilisation' || driver === 'fixedCost') {
      lowInput = DRIVER_SETTERS[driver](input, 1 - pct);
      highInput = DRIVER_SETTERS[driver](input, 1 + pct);
    } else {
      const base = input[driver];
      lowInput = DRIVER_SETTERS[driver](input, base * (1 - pct));
      highInput = DRIVER_SETTERS[driver](input, base * (1 + pct));
    }
    const lowNpv = npv(lowInput.discountRate, buildProject(lowInput).cashflows);
    const highNpv = npv(highInput.discountRate, buildProject(highInput).cashflows);
    return {
      driver,
      lowNpv,
      highNpv,
      swing: Math.abs(highNpv - lowNpv),
      downside: Math.min(lowNpv, highNpv) - baseNpv,
      upside: Math.max(lowNpv, highNpv) - baseNpv,
    };
  });
  results.sort((a, b) => b.swing - a.swing); // tornado order
  return { baseNpv, pct, results };
}

// ------------------------------------------------------------------
// Scenario analysis (best / base / worst)
// ------------------------------------------------------------------

/**
 * Apply multiplicative driver bundles to build best/base/worst variants and
 * compute the full metric suite for each.
 * bundles = { worst:{price,utilisation,varCostPerHour,fixedCost,equipment}, base:{...}, best:{...} }
 * Each field is a multiplier on the base input value (1 = unchanged).
 */
export function scenarioAnalysis(input, bundles) {
  const out = {};
  for (const [name, mults] of Object.entries(bundles)) {
    let variant = { ...input };
    if (mults.price != null) variant.price = input.price * mults.price;
    if (mults.varCostPerHour != null)
      variant.varCostPerHour = input.varCostPerHour * mults.varCostPerHour;
    if (mults.equipment != null) variant.equipment = input.equipment * mults.equipment;
    if (mults.utilisation != null) {
      const baseUtil = Array.isArray(input.utilisation)
        ? input.utilisation
        : Array.from({ length: input.life }, () => input.utilisation);
      variant.utilisation = baseUtil.map((u) => u * mults.utilisation);
    }
    if (mults.fixedCost != null) {
      const baseFixed = Array.isArray(input.fixedCost)
        ? input.fixedCost
        : Array.from({ length: input.life }, () => input.fixedCost);
      variant.fixedCost = baseFixed.map((f) => f * mults.fixedCost);
    }
    out[name] = computeMetrics(variant);
  }
  return out;
}

// ------------------------------------------------------------------
// Incremental Build - Buy comparison (audit fix F1)
// ------------------------------------------------------------------

/**
 * Builds the incremental (Build minus Buy) cash-flow vector, isolating the
 * capex-vs-opex trade-off. Revenue is common to both and cancels out.
 *
 * buildInput  : the on-prem project input (as for buildProject)
 * cloudRatePerHour : all-in cloud rental cost per GPU-hour served
 * cloudFixedCost   : annual fixed cost that remains in the buy case (scalar/array)
 *
 * Incremental t0     = build initial outlay (capex + install + WC)
 * Incremental OCF_t  = (cloudCostAvoided_t - onPremVariable_t - (buildFixed_t - buyFixed_t))*(1-tax)
 *                      + tax * depreciation_t
 * Incremental tN add = after-tax salvage + WC recovery
 */
export function incrementalBuildVsBuy(buildInput, { cloudRatePerHour, cloudFixedCost = 0 }) {
  const bp = buildProject(buildInput);
  const tax = buildInput.tax;
  const buyFixedArr = Array.isArray(cloudFixedCost)
    ? cloudFixedCost
    : Array.from({ length: buildInput.life }, () => cloudFixedCost);

  const cf = [bp.initial];
  const rows = [];
  bp.rows.forEach((r, i) => {
    const cloudAvoided = cloudRatePerHour * r.soldHours;
    const buildFixed = r.fixed;
    const buyFixed = buyFixedArr[i];
    const pretax = cloudAvoided - r.variable - (buildFixed - buyFixed);
    const incOcf = pretax * (1 - tax) + tax * r.depreciation;
    rows.push({ year: r.year, cloudAvoided, onPremVariable: r.variable, incOcf });
    cf.push(incOcf);
  });
  cf[buildInput.life] += bp.terminalAdd;

  const rate = buildInput.discountRate;
  return {
    rows,
    cashflows: cf,
    npv: npv(rate, cf),
    irr: irr(cf),
    profitabilityIndex: profitabilityIndex(rate, cf),
    payback: paybackPeriod(cf),
  };
}

export const _internal = { sum, round };
