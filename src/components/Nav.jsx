import { motion } from 'framer-motion';
import { fmtMoney } from '../lib/format.js';
import './Nav.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'results', label: 'Results' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'alternatives', label: 'Alternatives' },
  { id: 'ai', label: 'AI Advisor' },
];

export default function Nav({ active, setActive, verdict, metrics }) {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <button className="nav__brand" onClick={() => setActive('overview')}>
          <img src="/beacon.svg" alt="" className="nav__logo" />
          <div className="nav__brand-text">
            <div className="nav__title">
              BEACON <span className="nav__by">· Cardamom &amp; Co.</span>
            </div>
            <div className="nav__sub mono">Capital budgeting</div>
          </div>
        </button>

        <nav className="nav__tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav__tab ${active === t.id ? 'nav__tab--active' : ''}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
              {active === t.id && <motion.span layoutId="navInd" className="nav__ind" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            </button>
          ))}
        </nav>

        <div className="nav__meta">
          <span className={`nav__npv mono ${metrics.npv >= 0 ? 'text-pos' : 'text-neg'}`}>{fmtMoney(metrics.npv)}</span>
          <span className="nav__verdict-pill" style={{ '--c': verdict.accent }}>{verdict.verdict}</span>
        </div>
      </div>
    </header>
  );
}
