import { motion } from 'framer-motion';
import { fmtMoney, fmtMoneyCompact, fmtPct, fmtX, fmtYears } from '../lib/format.js';
import './AlternativesCompare.css';

const ACCENTS = ['var(--amber)', 'var(--cyan)', 'var(--violet)'];

export default function AlternativesCompare({ comparison, wacc }) {
  const { ranked, best } = comparison;
  const maxAbs = Math.max(...ranked.map((r) => Math.abs(r.metrics.npv)), 1);

  return (
    <div className="alts">
      <div className="alts__grid">
        {ranked.map((row, i) => {
          const m = row.metrics;
          const winner = row.key === best.key;
          const pct = (Math.abs(m.npv) / maxAbs) * 100;
          const accent = ACCENTS[i % ACCENTS.length];
          return (
            <motion.div
              key={row.key}
              className={`alt glass hairline ${winner ? 'alt--win' : ''}`}
              style={{ '--c': accent }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.09 }}
            >
              <div className="alt__rank mono">#{i + 1}</div>
              {winner && <span className="alt__crown">★ Recommended</span>}
              <div className="alt__name">{row.name}</div>
              <div className="alt__blurb mono">{row.blurb}</div>
              <div className={`alt__npv mono ${m.npv >= 0 ? 'text-pos' : 'text-neg'}`}>{fmtMoney(m.npv)}</div>
              <div className="alt__bar">
                <motion.div
                  className="alt__bar-fill"
                  style={{ background: m.npv >= 0 ? accent : 'var(--magenta)' }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="alt__stats mono">
                <span>IRR {fmtPct(m.irr, 1)}</span>
                <span>PI {fmtX(m.profitabilityIndex)}</span>
                <span>{fmtYears(m.payback)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="alts__verdict glass-strong hairline"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="alts__verdict-label mono">RECOMMENDED CHOICE</div>
        <div className="alts__verdict-name">{best.name}</div>
        <div className="alts__verdict-npv mono text-pos">{fmtMoney(best.metrics.npv)} NPV</div>
        <p className="alts__verdict-text">
          The outlets are <strong>mutually exclusive</strong> — only one branch opens — so the
          value-maximising rule is to pick the <strong>highest NPV</strong>. {best.name} leads with{' '}
          {fmtMoneyCompact(best.metrics.npv)} (IRR {fmtPct(best.metrics.irr, 1)}, PI{' '}
          {fmtX(best.metrics.profitabilityIndex)}), clearing the {fmtPct(wacc)} required return with the
          strongest margin of safety.
        </p>
      </motion.div>
    </div>
  );
}
