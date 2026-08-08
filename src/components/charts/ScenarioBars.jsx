import { motion } from 'framer-motion';
import { fmtUSDcompact, fmtPct, fmtX } from '../../lib/format.js';

const META = {
  worst: { label: 'Worst', color: 'var(--magenta)', grad: 'scWorst' },
  base: { label: 'Base', color: 'var(--violet)', grad: 'scBase' },
  best: { label: 'Best', color: 'var(--emerald)', grad: 'scBest' },
};
const ORDER = ['worst', 'base', 'best'];

/** Best / base / worst NPV bars with IRR & PI annotations. */
export default function ScenarioBars({ scenarios }) {
  const W = 560;
  const H = 340;
  const mT = 40;
  const mB = 58;
  const plotH = H - mT - mB;
  const rows = ORDER.map((k) => ({ key: k, ...scenarios[k], ...META[k] }));
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.npv)), 1);
  // Map so that +maxAbs -> mT, -maxAbs -> mT+plotH, 0 -> middle
  const yOf = (v) => mT + ((maxAbs - v) / (2 * maxAbs)) * plotH;
  const zeroY = yOf(0);

  const step = W / rows.length;
  const barW = 96;
  const xOf = (i) => (i + 0.5) * step;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scenario comparison">
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} className="chart-axis" />

      {rows.map((r, i) => {
        const pos = r.npv >= 0;
        const y = pos ? yOf(r.npv) : zeroY;
        const h = Math.abs(yOf(r.npv) - zeroY);
        return (
          <g key={r.key}>
            <motion.rect
              x={xOf(i) - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx="8"
              fill={`url(#${r.grad})`}
              style={{ transformBox: 'fill-box', transformOrigin: pos ? 'bottom' : 'top' }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* NPV value */}
            <text
              x={xOf(i)}
              y={pos ? y - 12 : y + h + 18}
              textAnchor="middle"
              className="chart-value"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {fmtUSDcompact(r.npv)}
            </text>
            {/* scenario name */}
            <text x={xOf(i)} y={H - 34} textAnchor="middle" className="chart-value" style={{ fill: r.color, fontWeight: 600 }}>
              {r.label}
            </text>
            {/* IRR / PI */}
            <text x={xOf(i)} y={H - 16} textAnchor="middle" className="chart-label">
              IRR {fmtPct(r.irr, 1)} · PI {fmtX(r.profitabilityIndex, 2)}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="scWorst" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(244,114,182,0.35)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
        <linearGradient id="scBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--violet)" />
          <stop offset="1" stopColor="rgba(139,92,246,0.3)" />
        </linearGradient>
        <linearGradient id="scBest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--emerald)" />
          <stop offset="1" stopColor="rgba(52,211,153,0.25)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
