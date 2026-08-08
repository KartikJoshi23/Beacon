/** Formatting helpers (display only — never used inside the calc engine). */
import { CURRENCY } from '../data/scenario.js';

export const fmtMoney = (x, dp = 0) =>
  x == null || Number.isNaN(x)
    ? '—'
    : x.toLocaleString('en-US', {
        style: 'currency',
        currency: CURRENCY,
        maximumFractionDigits: dp,
        minimumFractionDigits: dp,
      });

export const fmtMoneyCompact = (x) =>
  x == null || Number.isNaN(x)
    ? '—'
    : x.toLocaleString('en-US', {
        style: 'currency',
        currency: CURRENCY,
        notation: 'compact',
        maximumFractionDigits: 2,
      });

export const fmtPct = (x, dp = 2) =>
  x == null || Number.isNaN(x) ? '—' : (x * 100).toFixed(dp) + '%';

export const fmtNum = (x, dp = 0) =>
  x == null || Number.isNaN(x)
    ? '—'
    : x.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: dp });

export const fmtYears = (x) => (x == null ? 'Never' : `${x.toFixed(2)} yrs`);

export const fmtX = (x, dp = 2) => (x == null || Number.isNaN(x) ? '—' : x.toFixed(dp) + '×');

// Backwards-compatible aliases (charts still import these names).
export const fmtUSD = fmtMoney;
export const fmtUSDcompact = fmtMoneyCompact;
