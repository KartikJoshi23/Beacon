/**
 * scenario.js — Project BEACON dataset.
 * Company: "Cardamom & Co." — a fictional but realistic Dubai specialty-coffee
 * & bakehouse chain deciding where to open its next branch.
 * Currency: AED. Figures are calibrated so the decision is genuinely marginal
 * for the flagship option and so the alternatives rank cleanly.
 */

export const CURRENCY = 'AED';

export const COMPANY = {
  name: 'Cardamom & Co.',
  sector: 'Specialty coffee & bakehouse',
  city: 'Dubai, UAE',
  decision: 'Open a new branch',
  question: 'Which new outlet — if any — should we open?',
};

// Shared assumptions applied to every location.
const COMMON = {
  life: 6, // years (lease term)
  revenueGrowth: 0.06, // annual same-store sales growth
  fixedGrowth: 0.03, // annual rent / wage escalation
  variableCostPct: 0.37, // COGS + packaging + card fees (default; overridden per site)
  depreciateToSalvage: true,
  tax: 0.09, // UAE corporate tax
  taxLossOffset: true,
  opportunityCostAnnual: 0,
  discountRate: 0.14, // required return / WACC
  reinvestRate: 0.14, // MIRR reinvestment
  sunkCost: 40000, // feasibility & market study already paid — EXCLUDED
};

export const LOCATION_A = {
  key: 'A',
  name: 'The Dubai Mall — flagship',
  blurb: 'Premium footfall, premium rent',
  input: {
    ...COMMON,
    initialInvestment: 1_200_000, // fit-out, equipment, furniture
    installTransport: 180_000, // installation, signage, kitchen setup, freight
    workingCapital: 150_000, // inventory + supplier deposits + float
    revenueYear1: 2_900_000,
    variableCostPct: 0.36,
    fixedCost: 1_550_000, // rent + salaries + utilities + marketing (yr 1)
    salvage: 180_000,
  },
};

export const LOCATION_B = {
  key: 'B',
  name: 'JLT high-street unit',
  blurb: 'Lower rent, loyal neighbourhood trade',
  input: {
    ...COMMON,
    initialInvestment: 780_000,
    installTransport: 110_000,
    workingCapital: 110_000,
    revenueYear1: 2_050_000,
    variableCostPct: 0.37,
    fixedCost: 890_000,
    salvage: 120_000,
  },
};

export const LOCATION_C = {
  key: 'C',
  name: 'Delivery-only cloud kitchen',
  blurb: 'Lean capex, delivery-platform reliant',
  input: {
    ...COMMON,
    initialInvestment: 340_000,
    installTransport: 60_000,
    workingCapital: 70_000,
    revenueYear1: 1_150_000,
    variableCostPct: 0.42, // higher aggregator commissions
    fixedCost: 520_000,
    salvage: 45_000,
  },
};

export const ALTERNATIVES = [LOCATION_A, LOCATION_B, LOCATION_C];

// Default project loaded into the app.
export const BASE_CASE = LOCATION_A.input;

// Best / base / worst multiplier bundles (applied to base-case drivers).
export const SCENARIO_BUNDLES = {
  worst: { revenue: 0.85, variableCostPct: 1.1, fixedCost: 1.08, initialInvestment: 1.1 },
  base: {},
  best: { revenue: 1.12, variableCostPct: 0.92, fixedCost: 0.97, initialInvestment: 0.95 },
};
