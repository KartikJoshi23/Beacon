/** Formatting helpers (display only — never used inside the calc engine). */

export const fmtUSD = (x, dp = 0) =>
  x == null || Number.isNaN(x)
    ? '—'
    : x.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: dp,
        minimumFractionDigits: dp,
      });

export const fmtUSDcompact = (x) =>
  x == null || Number.isNaN(x)
    ? '—'
    : x.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
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

export const fmtX = (x, dp = 3) => (x == null || Number.isNaN(x) ? '—' : x.toFixed(dp) + '×');
