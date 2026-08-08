import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber.jsx';
import './MetricCard.css';

/**
 * A single result tile.
 * props: label, value (number), format (fn), sub (string), tone ('pos'|'neg'|'warn'|'neutral'),
 *        accent (css color var), index (for stagger), hint (tooltip), icon
 */
export default function MetricCard({
  label,
  value,
  format,
  sub,
  tone = 'neutral',
  accent = 'var(--cyan)',
  index = 0,
  hint,
  big = false,
}) {
  return (
    <motion.div
      className={`metric-card glass hairline tone-${tone} ${big ? 'metric-card--big' : ''}`}
      style={{ '--accent': accent }}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.55, delay: (index % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <div className="metric-card__glow" />
      <div className="metric-card__head">
        <span className="metric-card__label">{label}</span>
        {hint && (
          <span className="metric-card__info" title={hint}>
            i
          </span>
        )}
      </div>
      <div className="metric-card__value mono">
        {typeof value === 'number' ? <AnimatedNumber value={value} format={format} /> : value}
      </div>
      {sub && <div className="metric-card__sub">{sub}</div>}
    </motion.div>
  );
}
