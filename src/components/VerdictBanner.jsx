import { motion } from 'framer-motion';
import { fmtUSD, fmtPct, fmtX } from '../lib/format.js';
import './VerdictBanner.css';

export default function VerdictBanner({ verdict, metrics, wacc }) {
  const { verdict: v, tone, accent, headline, reasons } = verdict;
  return (
    <motion.div
      className={`verdict glass-strong hairline tone-${tone}`}
      style={{ '--accent': accent }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="verdict__glow" />
      <div className="verdict__left">
        <div className="verdict__eyebrow mono">AI-ASSISTED RECOMMENDATION</div>
        <div className="verdict__badge">{v}</div>
        <p className="verdict__headline">{headline}</p>
        <ul className="verdict__reasons">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="verdict__stats">
        <Stat label="NPV" value={fmtUSD(metrics.npv)} good={metrics.npv > 0} />
        <Stat label="IRR" value={fmtPct(metrics.irr)} good={metrics.irr > wacc} sub={`vs ${fmtPct(wacc)} hurdle`} />
        <Stat label="PI" value={fmtX(metrics.profitabilityIndex)} good={metrics.profitabilityIndex > 1} />
      </div>
    </motion.div>
  );
}

function Stat({ label, value, good, sub }) {
  return (
    <div className="verdict__stat">
      <div className="verdict__stat-label mono">{label}</div>
      <div className={`verdict__stat-value mono ${good ? 'text-pos' : 'text-neg'}`}>{value}</div>
      {sub && <div className="verdict__stat-sub">{sub}</div>}
    </div>
  );
}
