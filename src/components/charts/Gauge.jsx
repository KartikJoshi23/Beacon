import { motion } from 'framer-motion';
import { fmtPct } from '../../lib/format.js';

/** Semicircular gauge: IRR position on a 0..max scale with the WACC hurdle marked. */
export default function Gauge({ value, hurdle, label = 'IRR', max }) {
  const W = 260;
  const H = 168;
  const cx = W / 2;
  const cy = 150;
  const R = 108;
  const scaleMax = max ?? Math.max(0.35, (value ?? 0) * 1.25, (hurdle ?? 0) * 1.6);
  const clamp = (t) => Math.max(0, Math.min(1, t));
  const tVal = clamp((value ?? 0) / scaleMax);
  const tHur = clamp((hurdle ?? 0) / scaleMax);

  const pt = (t, r = R) => {
    const ang = Math.PI - t * Math.PI; // 180deg -> 0deg
    return [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
  };
  const arc = (t0, t1, r = R) => {
    const [x0, y0] = pt(t0, r);
    const [x1, y1] = pt(t1, r);
    const large = t1 - t0 > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  const good = (value ?? 0) >= (hurdle ?? 0);
  const [hx, hy] = pt(tHur, R + 10);
  const [hx2, hy2] = pt(tHur, R - 14);
  const [nx, ny] = pt(tVal);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} gauge`} style={{ maxWidth: 300, margin: '0 auto' }}>
      {/* track */}
      <path d={arc(0, 1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
      {/* value arc */}
      <motion.path
        d={arc(0, 1)}
        fill="none"
        stroke={good ? 'url(#gGood)' : 'url(#gBad)'}
        strokeWidth="14"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: tVal }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* hurdle marker */}
      <line x1={hx} y1={hy} x2={hx2} y2={hy2} stroke="var(--amber)" strokeWidth="2.5" />
      <text x={pt(tHur, R + 22)[0]} y={pt(tHur, R + 22)[1]} textAnchor="middle" className="chart-label" fill="var(--amber)">
        {fmtPct(hurdle, 0)}
      </text>
      {/* needle dot */}
      <motion.circle
        cx={nx}
        cy={ny}
        r="7"
        fill={good ? 'var(--emerald)' : 'var(--magenta)'}
        stroke="var(--bg-1)"
        strokeWidth="2.5"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
      />
      {/* center readout */}
      <text x={cx} y={cy - 30} textAnchor="middle" style={{ fill: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 600 }}>
        {fmtPct(value, 1)}
      </text>
      <text x={cx} y={cy - 10} textAnchor="middle" className="chart-label">
        {label} · hurdle {fmtPct(hurdle, 0)}
      </text>

      <defs>
        <linearGradient id="gGood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--cyan)" />
          <stop offset="1" stopColor="var(--emerald)" />
        </linearGradient>
        <linearGradient id="gBad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--amber)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
