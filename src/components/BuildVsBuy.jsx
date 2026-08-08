import { motion } from 'framer-motion';
import { fmtUSD, fmtUSDcompact, fmtPct, fmtX } from '../lib/format.js';
import './BuildVsBuy.css';

export default function BuildVsBuy({ build, buy, small, incremental, wacc }) {
  const options = [
    { key: 'build', name: 'Build', tag: 'On-prem 32-GPU', npv: build.npv, irr: build.irr, color: 'var(--cyan)' },
    { key: 'buy', name: 'Buy', tag: 'Cloud rental', npv: buy.npv, irr: buy.irr, color: 'var(--magenta)' },
    { key: 'small', name: 'Build (small)', tag: 'On-prem 16-GPU', npv: small.npv, irr: small.irr, color: 'var(--violet)' },
  ];
  const maxAbs = Math.max(...options.map((o) => Math.abs(o.npv)), 1);
  const bestNpv = Math.max(...options.map((o) => o.npv));
  const buyWins = incremental.npv < 0;
  const margin = Math.abs(incremental.npv);

  return (
    <div className="bvb">
      <div className="bvb__options">
        {options.map((o, i) => {
          const winner = o.npv === bestNpv;
          const pct = (Math.abs(o.npv) / maxAbs) * 100;
          return (
            <motion.div
              key={o.key}
              className={`bvb__opt glass hairline ${winner ? 'bvb__opt--win' : ''}`}
              style={{ '--c': o.color }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              {winner && <span className="bvb__crown">★ Highest NPV</span>}
              <div className="bvb__opt-name">{o.name}</div>
              <div className="bvb__opt-tag mono">{o.tag}</div>
              <div className={`bvb__opt-npv mono ${o.npv >= 0 ? 'text-pos' : 'text-neg'}`}>{fmtUSD(o.npv)}</div>
              <div className="bvb__bar">
                <motion.div
                  className="bvb__bar-fill"
                  style={{ background: o.npv >= 0 ? o.color : 'var(--magenta)' }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="bvb__opt-irr mono dim">IRR {fmtPct(o.irr, 1)}</div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="bvb__verdict glass-strong hairline"
        style={{ '--c': buyWins ? 'var(--amber)' : 'var(--emerald)' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="bvb__verdict-label mono">INCREMENTAL · BUILD − BUY</div>
        <div className="bvb__verdict-main">
          <span className={`mono ${incremental.npv >= 0 ? 'text-pos' : 'text-neg'}`}>{fmtUSD(incremental.npv)}</span>
          <span className="bvb__verdict-sub mono">
            IRR {fmtPct(incremental.irr, 2)} · PI {fmtX(incremental.profitabilityIndex, 3)}
          </span>
        </div>
        <p className="bvb__verdict-text">
          {buyWins ? (
            <>
              Renting is the higher-value path — building destroys{' '}
              <strong>{fmtUSDcompact(margin)}</strong> of value relative to cloud. The capex isn't
              justified by the savings; revisit hardware pricing or utilisation commitments first.
            </>
          ) : (
            <>
              Building beats renting on an incremental basis, adding{' '}
              <strong>{fmtUSDcompact(margin)}</strong> over cloud. The capex earns its keep.
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
