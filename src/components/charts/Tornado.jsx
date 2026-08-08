import { motion } from 'framer-motion';
import { fmtUSDcompact } from '../../lib/format.js';

const LABELS = {
  price: 'Price / GPU-hr',
  utilisation: 'Utilisation',
  equipment: 'Equipment capex',
  fixedCost: 'Fixed cost',
  discountRate: 'WACC',
  varCostPerHour: 'Variable cost',
};

/** Sensitivity tornado: NPV range per driver at ±pct, sorted by swing. */
export default function Tornado({ sensitivity }) {
  const { baseNpv, pct, results } = sensitivity;
  const W = 820;
  const labelW = 150;
  const mR = 60;
  const mT = 14;
  const mB = 34;
  const rowH = 46;
  const H = mT + results.length * rowH + mB;
  const plotL = labelW;
  const plotR = W - mR;

  const allVals = results.flatMap((r) => [r.lowNpv, r.highNpv]).concat([0, baseNpv]);
  let lo = Math.min(...allVals);
  let hi = Math.max(...allVals);
  const padSpan = (hi - lo) * 0.08 || 1;
  lo -= padSpan;
  hi += padSpan;
  const xOf = (v) => plotL + ((v - lo) / (hi - lo)) * (plotR - plotL);

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sensitivity tornado">
      {/* gridlines + tick labels */}
      {tickVals.map((t, i) => (
        <g key={i}>
          <line x1={xOf(t)} y1={mT} x2={xOf(t)} y2={H - mB} className="chart-grid" />
          <text x={xOf(t)} y={H - 14} textAnchor="middle" className="chart-label">
            {fmtUSDcompact(t)}
          </text>
        </g>
      ))}

      {/* NPV = 0 decision boundary */}
      <line x1={xOf(0)} y1={mT} x2={xOf(0)} y2={H - mB} stroke="var(--rose)" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.8" />
      <text x={xOf(0)} y={mT - 2} textAnchor="middle" className="chart-label" fill="var(--rose)">
        NPV 0
      </text>

      {/* base NPV reference */}
      <line x1={xOf(baseNpv)} y1={mT} x2={xOf(baseNpv)} y2={H - mB} stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />

      {results.map((r, i) => {
        const y = mT + i * rowH + rowH / 2;
        const bh = 20;
        const down = Math.min(r.lowNpv, r.highNpv);
        const up = Math.max(r.lowNpv, r.highNpv);
        const xBase = xOf(baseNpv);
        const xDown = xOf(down);
        const xUp = xOf(up);
        return (
          <g key={r.driver}>
            <text x={labelW - 12} y={y + 4} textAnchor="end" className="chart-value">
              {LABELS[r.driver] || r.driver}
            </text>
            {/* downside (base -> min) */}
            <motion.rect
              x={xDown}
              y={y - bh / 2}
              width={Math.max(0, xBase - xDown)}
              height={bh}
              rx="4"
              fill="url(#tornDown)"
              style={{ transformBox: 'fill-box', transformOrigin: 'right' }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* upside (base -> max) */}
            <motion.rect
              x={xBase}
              y={y - bh / 2}
              width={Math.max(0, xUp - xBase)}
              height={bh}
              rx="4"
              fill="url(#tornUp)"
              style={{ transformBox: 'fill-box', transformOrigin: 'left' }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.06 + 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* swing label */}
            <text x={plotR + 6} y={y + 4} className="chart-label" fill="var(--text-muted)">
              {fmtUSDcompact(r.swing)}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="tornDown" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--magenta)" />
          <stop offset="1" stopColor="rgba(244,114,182,0.35)" />
        </linearGradient>
        <linearGradient id="tornUp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(52,211,153,0.4)" />
          <stop offset="1" stopColor="var(--emerald)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
