import { motion } from 'framer-motion';
import { fmtUSDcompact } from '../../lib/format.js';

/** Net cash flow per period (bars) with the cumulative running total (line). */
export default function Waterfall({ cashflows }) {
  const W = 820;
  const H = 340;
  const mL = 12;
  const mR = 12;
  const mT = 26;
  const mB = 34;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;
  const yZero = mT + plotH / 2;
  const half = plotH / 2;

  const n = cashflows.length;
  const cumulative = [];
  cashflows.reduce((acc, v, i) => (cumulative[i] = acc + v), 0);

  const maxAbs = Math.max(...cashflows.map((v) => Math.abs(v)), ...cumulative.map((v) => Math.abs(v)), 1);
  const yOf = (v) => yZero - (v / maxAbs) * half;
  const step = plotW / n;
  const barW = Math.min(step * 0.46, 54);
  const xOf = (i) => mL + (i + 0.5) * step;

  const linePath = cumulative.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}`).join(' ');
  const labels = cashflows.map((_, i) => (i === 0 ? 't₀' : `Y${i}`));

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cash flow timeline">
      {/* zero baseline */}
      <line x1={mL} y1={yZero} x2={W - mR} y2={yZero} className="chart-axis" />

      {/* bars */}
      {cashflows.map((v, i) => {
        const y = v >= 0 ? yOf(v) : yZero;
        const h = Math.abs(yOf(v) - yZero);
        const pos = v >= 0;
        return (
          <g key={i}>
            <motion.rect
              x={xOf(i) - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx="5"
              fill={pos ? 'url(#wfPos)' : 'url(#wfNeg)'}
              style={{ transformBox: 'fill-box', transformOrigin: pos ? 'bottom' : 'top' }}
              initial={{ scaleY: 0, opacity: 0.4 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
            <text
              x={xOf(i)}
              y={pos ? y - 8 : y + h + 14}
              textAnchor="middle"
              className="chart-value"
            >
              {fmtUSDcompact(v)}
            </text>
            <text x={xOf(i)} y={H - 12} textAnchor="middle" className="chart-label">
              {labels[i]}
            </text>
          </g>
        );
      })}

      {/* cumulative line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="var(--amber)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
      />
      {cumulative.map((v, i) => (
        <motion.circle
          key={i}
          cx={xOf(i)}
          cy={yOf(v)}
          r="3.6"
          fill="var(--amber)"
          stroke="var(--bg-1)"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.4 + i * 0.12 }}
        />
      ))}

      <defs>
        <linearGradient id="wfPos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--cyan)" />
          <stop offset="1" stopColor="rgba(34,211,238,0.25)" />
        </linearGradient>
        <linearGradient id="wfNeg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(244,114,182,0.3)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
