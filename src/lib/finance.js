/**
 * finance.js — Capital-budgeting engine (Project BEACON)
 * ------------------------------------------------------------------
 * Pure, dependency-free, deterministic. Currency-agnostic.
 * Convention: a "cashflows" array is indexed by year; cashflows[0] is the
 * time-0 outlay (already negative). Rates are decimals (0.14 = 14%).
 *
 * The operating model uses ONLY the generic, brief-mandated inputs
 * (initial investment, install/transport, working capital, life, annual
 * revenues, fixed & variable costs, depreciation, tax, salvage, required
 * return). It is not tied to any single industry, so a non-finance user can
 * drive it directly. scripts/verify.mjs proves every formula.
 */

// ------------------------------------------------------------------
// Numeric helpers
// ------------------------------------------------------------------
const sum = (a) => a.reduce((s, x) => s + x, 0);
const round = (x, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((x + Number.EPSILON) * f) / f;
};

// ------------------------------------------------------------------
// Core time-value primitives (verified — unchanged)
// ------------------------------------------------------------------

/** Net Present Value including the t0 outlay. cashflows[0] is time 0. */
export function npv(rate, cashflows) {
  return cashflows.reduce((acc, cf, t) => acc + cf / (1 + rate) ** t, 0);
}

/** Internal Rate of Return via robust bracketing + bisection. */
export function irr(cashflows, { lo = -0.9999, hi = 100, tol = 1e-9, maxIter = 500 } = {}) {
  const f = (r) => npv(r, cashflows);
  let a = lo;
  let b = hi;
  let fa = f(a);
  let fb = f(b);
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

/** Modified IRR. Negatives discounted at financeRate; positives compounded at reinvestRate. */
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
  const pvInflows = npv(rate, cashflows) - cashflows[0];
  return pvInflows / initial;
}

/** Undiscounted payback period with linear interpolation. */
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
  return null;
}

/** Discounted payback period (interpolated). */
export function discountedPayback(rate, cashflows) {
  const disc = cashflows.map((cf, t) => cf / (1 + rate) ** t);
  return paybackPeriod(disc);
}

/**
 * Accounting Rate of Return.
 * onAverageInvestment = avg after-tax profit / average investment [(base+salvage)/2]
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

/** Straight-line schedule. To salvage by default, or to zero (tax convention). */
export function straightLineDepreciation({ depreciableBase, life, salvage = 0, toSalvage = true }) {
  const target = toSalvage ? salvage : 0;
  const annual = (depreciableBase - target) / life;
  return Array.from({ length: life }, () => annual);
}

// ------------------------------------------------------------------
// Generic project builder
// ------------------------------------------------------------------

/**
 * Build the full year-by-year schedule and net cash-flow vector.
 *
 * Revenue_t   = revenueOverrides[t]  OR  revenueYear1 * (1+revenueGrowth)^(t-1)
 * Variable_t  = variableCostPct * Revenue_t
 * Fixed_t     = fixedCost[t]  OR  fixedCost * (1+fixedGrowth)^(t-1)
 * EBIT_t      = Revenue_t - Variable_t - Fixed_t - Opportunity_t - Dep_t
 * Tax_t       = EBIT_t * tax          (symmetric loss offset when enabled)
 * OCF_t       = EBIT_t - Tax_t + Dep_t
 *
 * Initial (t0)   = -(initialInvestment + installTransport + workingCapital)   [sunk cost EXCLUDED]
 * Terminal (tN) += [salvage - tax*(salvage - bookEnd)] + workingCapital
 */
export function buildProject(input) {
  const {
    initialInvestment,
    installTransport = 0,
    workingCapital = 0,
    life,
    revenueYear1,
    revenueGrowth = 0,
    revenueOverrides = null,
    variableCostPct,
    fixedCost,
    fixedGrowth = 0,
    depreciateToSalvage = true,
    salvage = 0,
    tax,
    opportunityCostAnnual = 0,
    taxLossOffset = true,
    sunkCost = 0, // stored for display; intentionally EXCLUDED
  } = input;

  const depreciableBase = initialInvestment + installTransport;
  const dep = straightLineDepreciation({ depreciableBase, life, salvage, toSalvage: depreciateToSalvage });
  const bookEnd = depreciateToSalvage ? salvage : 0;

  const rows = [];
  const afterTaxProfits = [];
  for (let i = 0; i < life; i++) {
    const revenue = revenueOverrides ? revenueOverrides[i] : revenueYear1 * (1 + revenueGrowth) ** i;
    const variable = variableCostPct * revenue;
    const fixed = Array.isArray(fixedCost) ? fixedCost[i] : fixedCost * (1 + fixedGrowth) ** i;
    const opp = opportunityCostAnnual;
    const ebit = revenue - variable - fixed - opp - dep[i];
    const taxable = taxLossOffset ? ebit : Math.max(0, ebit);
    const taxAmt = taxable * tax;
    const nopat = ebit - taxAmt;
    const ocf = nopat + dep[i];
    afterTaxProfits.push(nopat);
    rows.push({ year: i + 1, revenue, variable, fixed, opportunity: opp, depreciation: dep[i], ebit, tax: taxAmt, nopat, ocf });
  }

  const initial = -(initialInvestment + installTransport + workingCapital);
  const afterTaxSalvage = salvage - tax * (salvage - bookEnd);
  const terminalAdd = afterTaxSalvage + workingCapital;

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
// Metric suite (all 13 outputs)
// ------------------------------------------------------------------

export function computeMetrics(input) {
  const project = buildProject(input);
  const { cashflows, rows, afterTaxProfits, depreciableBase } = project;
  const rate = input.discountRate;

  const npvValue = npv(rate, cashflows);
  const irrValue = irr(cashflows);
  const reinvest = input.reinvestRate ?? rate;
  const mirrValue = mirr(cashflows, rate, reinvest);
  const pi = profitabilityIndex(rate, cashflows);
  const payback = paybackPeriod(cashflows);
  const discPayback = discountedPayback(rate, cashflows);
  const arrValue = arr({ afterTaxProfits, depreciableBase, salvage: input.salvage ?? 0 });

  // Accounting break-even in revenue terms (year 1 basis):
  const contributionRatio = 1 - input.variableCostPct;
  const beRevenue =
    contributionRatio <= 0 ? null : (rows[0].fixed + project.dep[0] + (input.opportunityCostAnnual ?? 0)) / contributionRatio;
  const beRevenuePctY1 = beRevenue == null ? null : beRevenue / rows[0].revenue;

  return {
    project,
    initialCashFlow: project.initial,
    annualOperatingCashFlows: rows.map((r) => r.ocf),
    terminalCashFlow: project.terminalAdd,
    payback,
    discountedPayback: discPayback,
    arr: arrValue,
    npv: npvValue,
    irr: irrValue,
    mirr: mirrValue,
    profitabilityIndex: pi,
    breakEven: { revenue: beRevenue, pctOfYear1: beRevenuePctY1, contributionRatio },
    cashflows,
  };
}

// ------------------------------------------------------------------
// NPV break-even on the revenue scale (solve for revenue factor s.t. NPV=0)
// ------------------------------------------------------------------

export function npvBreakEvenRevenue(input) {
  const npvAtK = (k) => {
    const scaled = { ...input };
    if (input.revenueOverrides) scaled.revenueOverrides = input.revenueOverrides.map((r) => r * k);
    else scaled.revenueYear1 = input.revenueYear1 * k;
    return npv(input.discountRate, buildProject(scaled).cashflows);
  };
  let a = 0;
  let b = 3;
  let fa = npvAtK(a);
  let fb = npvAtK(b);
  if (fa * fb > 0) return null;
  let mid = a;
  for (let i = 0; i < 300; i++) {
    mid = (a + b) / 2;
    const fm = npvAtK(mid);
    if (Math.abs(fm) < 1e-6 || (b - a) / 2 < 1e-9) break;
    if (fa * fm < 0) b = mid;
    else {
      a = mid;
      fa = fm;
    }
  }
  return { factor: mid, revenueAtBE: (input.revenueYear1 ?? 0) * mid };
}

// ------------------------------------------------------------------
// Sensitivity (one-at-a-time, multiplicative) -> tornado
// ------------------------------------------------------------------

const DRIVER_SETTERS = {
  revenue: (inp, f) =>
    inp.revenueOverrides
      ? { ...inp, revenueOverrides: inp.revenueOverrides.map((r) => r * f) }
      : { ...inp, revenueYear1: inp.revenueYear1 * f },
  variableCostPct: (inp, f) => ({ ...inp, variableCostPct: inp.variableCostPct * f }),
  fixedCost: (inp, f) => ({
    ...inp,
    fixedCost: (Array.isArray(inp.fixedCost) ? inp.fixedCost : Array.from({ length: inp.life }, () => inp.fixedCost)).map(
      (x) => x * f
    ),
  }),
  initialInvestment: (inp, f) => ({ ...inp, initialInvestment: inp.initialInvestment * f }),
  salvage: (inp, f) => ({ ...inp, salvage: inp.salvage * f }),
  discountRate: (inp, f) => ({ ...inp, discountRate: inp.discountRate * f }),
};

export function sensitivity(input, { pct = 0.2, drivers = Object.keys(DRIVER_SETTERS) } = {}) {
  const baseNpv = npv(input.discountRate, buildProject(input).cashflows);
  const results = drivers.map((driver) => {
    const lowInput = DRIVER_SETTERS[driver](input, 1 - pct);
    const highInput = DRIVER_SETTERS[driver](input, 1 + pct);
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
  results.sort((a, b) => b.swing - a.swing);
  return { baseNpv, pct, results };
}

// ------------------------------------------------------------------
// Scenario analysis (best / base / worst)
// ------------------------------------------------------------------

export function scenarioAnalysis(input, bundles) {
  const out = {};
  for (const [name, mults] of Object.entries(bundles)) {
    const v = { ...input };
    if (mults.revenue != null) {
      if (input.revenueOverrides) v.revenueOverrides = input.revenueOverrides.map((r) => r * mults.revenue);
      else v.revenueYear1 = input.revenueYear1 * mults.revenue;
    }
    if (mults.variableCostPct != null) v.variableCostPct = input.variableCostPct * mults.variableCostPct;
    if (mults.fixedCost != null)
      v.fixedCost = (Array.isArray(input.fixedCost) ? input.fixedCost : Array.from({ length: input.life }, () => input.fixedCost)).map(
        (x) => x * mults.fixedCost
      );
    if (mults.initialInvestment != null) v.initialInvestment = input.initialInvestment * mults.initialInvestment;
    out[name] = computeMetrics(v);
  }
  return out;
}

// ------------------------------------------------------------------
// Compare investment alternatives (rank by NPV)
// ------------------------------------------------------------------

/**
 * alternatives: [{ key, name, blurb?, input }]
 * Returns each alternative's full metric suite plus an NPV-ranked view.
 */
export function compareAlternatives(alternatives) {
  const rows = alternatives.map((a) => ({
    key: a.key,
    name: a.name,
    blurb: a.blurb,
    input: a.input,
    metrics: computeMetrics(a.input),
  }));
  const ranked = [...rows].sort((x, y) => y.metrics.npv - x.metrics.npv);
  return { rows, ranked, best: ranked[0] };
}

export const _internal = { sum, round };
