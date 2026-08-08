/**
 * prometheus.js — Base-case dataset and alternatives for Project PROMETHEUS.
 * Company: Nexus Intelligence FZ-LLC (Dubai). Currency: USD.
 * Decision: build an on-prem 32-GPU inference cluster vs. rent cloud capacity.
 *
 * Figures are calibrated to a deliberately MARGINAL base case so that the
 * sensitivity and scenario analyses are genuinely informative (the decision
 * can flip across cases). Sources & justification are documented in the report.
 */

export const BASE_CASE = {
  // --- Capital outlay ---
  equipment: 1_280_000, // 32 accelerator nodes incl. servers & networking (~$40k/GPU all-in)
  installation: 70_000, // racking, electrical fit-out, network build-out
  transportation: 40_000, // freight & logistics of hardware
  workingCapital: 140_000, // spare parts + prepaid-power deposit + net receivables
  sunkCost: 25_000, // feasibility study already paid — EXCLUDED from analysis

  // --- Project horizon ---
  life: 5,

  // --- Operating model (capacity/utilisation driven) ---
  price: 4.0, // $ per GPU-hour sold to customers
  capacityHours: 266_000, // 32 GPUs * 8760 h * ~0.95 availability
  utilisation: [0.62, 0.78, 0.88, 0.85, 0.75], // ramp then late-life decline
  varCostPerHour: 0.18, // electricity + cooling + variable maintenance per GPU-hour
  fixedCost: 360_000, // staff, colocation, bandwidth, insurance (per year)

  // --- Depreciation / tax / salvage ---
  depreciateToSalvage: false, // straight-line to zero (tax convention)
  salvage: 179_200, // ~14% of equipment resold at end of life
  tax: 0.09, // UAE corporate tax
  taxLossOffset: true, // symmetric tax / group loss relief on early-year losses
  opportunityCostAnnual: 0, // rack space has no alternative rental use (documented)

  // --- Cost of capital ---
  discountRate: 0.13, // WACC
  reinvestRate: 0.13, // MIRR reinvestment assumption (= WACC)
};

// "Buy" alternative parameters (cloud rental serving the same demand).
export const CLOUD_ALTERNATIVE = {
  cloudRatePerHour: 3.1, // all-in committed-use cloud GPU rate
  cloudFixedCost: 150_000, // slimmer fixed cost (account mgmt, no on-prem ops team)
};

// Smaller-tier third option (16-GPU cluster) for a three-way comparison.
export const SMALL_TIER = {
  ...BASE_CASE,
  equipment: 660_000,
  installation: 45_000,
  transportation: 24_000,
  workingCapital: 85_000,
  capacityHours: 133_000,
  salvage: 92_400,
};

// Best / base / worst multiplier bundles (applied to base-case drivers).
export const SCENARIO_BUNDLES = {
  worst: { price: 0.85, utilisation: 0.85, varCostPerHour: 1.25, fixedCost: 1.1, equipment: 1.1 },
  base: {},
  best: { price: 1.15, utilisation: 1.1, varCostPerHour: 0.85, fixedCost: 0.95, equipment: 0.95 },
};
