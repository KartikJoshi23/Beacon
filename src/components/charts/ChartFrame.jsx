import { motion } from 'framer-motion';
import './charts.css';

export default function ChartFrame({ title, sub, badge, className = '', children }) {
  return (
    <motion.div
      className={`chart-card glass hairline ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">{title}</div>
          {sub && <div className="chart-card__sub">{sub}</div>}
        </div>
        {badge && <div className="chart-card__badge">{badge}</div>}
      </div>
      {children}
    </motion.div>
  );
}
