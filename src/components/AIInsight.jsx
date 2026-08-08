import { motion } from 'framer-motion';
import { fmtMoney, fmtPct } from '../lib/format.js';
import './AIInsight.css';

const VERDICT_ACCENT = {
  Accept: 'var(--emerald)',
  Reject: 'var(--magenta)',
  Delay: 'var(--amber)',
  'Review Further': 'var(--amber)',
};

export default function AIInsight({ insight }) {
  const { explanation, risks, alternatives, recommendation, meta } = insight;
  const accent = VERDICT_ACCENT[recommendation.verdict] || 'var(--amber)';

  return (
    <div className="ai">
      <div className="ai__head glass hairline">
        <div className="ai__avatar" aria-hidden>◆</div>
        <div className="ai__head-text">
          <div className="ai__title">AI Advisor</div>
          <div className="ai__source mono">{meta?.source || 'insight engine'}</div>
        </div>
        <div className="ai__verdict" style={{ '--c': accent }}>
          {recommendation.verdict}
        </div>
      </div>

      <motion.div className="ai__block glass hairline" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <h4 className="ai__h">In plain language</h4>
        {explanation.map((p, i) => (
          <p key={i} className="ai__p">{p}</p>
        ))}
      </motion.div>

      <div className="ai__risks">
        <motion.div className="ai__block glass hairline" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>
          <h4 className="ai__h ai__h--neg">Financial risks</h4>
          <ul className="ai__list">
            {risks.financial.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div className="ai__block glass hairline" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          <h4 className="ai__h ai__h--warn">Non-financial risks</h4>
          <ul className="ai__list">
            {risks.nonFinancial.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </motion.div>
      </div>

      <motion.div className="ai__block glass hairline" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>
        <h4 className="ai__h">Alternatives, ranked</h4>
        <div className="ai__alts">
          {alternatives.map((a) => (
            <div className="ai__alt" key={a.rank}>
              <span className="ai__alt-rank mono">#{a.rank}</span>
              <span className="ai__alt-name">{a.name}</span>
              <span className="ai__alt-npv mono">{fmtMoney(a.npv)}</span>
              <span className="ai__alt-irr mono dim">IRR {fmtPct(a.irr, 1)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="ai__reco glass-strong hairline" style={{ '--c': accent }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="ai__reco-label mono">FINAL RECOMMENDATION</div>
        <p className="ai__reco-text">{recommendation.text}</p>
      </motion.div>

      <p className="ai__disclaimer muted">
        These insights are generated from the computed metrics and are meant to support — not replace —
        the analyst’s judgement. The narrative currently comes from the offline engine; a live Claude or
        NVIDIA-hosted model can be plugged in without changing the interface.
      </p>
    </div>
  );
}
