import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { computeMetrics, incrementalBuildVsBuy } from './lib/finance.js';
import { deriveVerdict } from './lib/verdict.js';
import { BASE_CASE, CLOUD_ALTERNATIVE } from './data/prometheus.js';
import InputForm from './components/InputForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import VerdictBanner from './components/VerdictBanner.jsx';
import './App.css';

const INITIAL = {
  ...BASE_CASE,
  cloudRatePerHour: CLOUD_ALTERNATIVE.cloudRatePerHour,
  cloudFixedCost: CLOUD_ALTERNATIVE.cloudFixedCost,
};

export default function App() {
  const [input, setInput] = useState(INITIAL);

  const patch = useCallback((p) => {
    setInput((prev) => {
      const next = { ...prev, ...p };
      // Keep the utilisation array length in sync with project life.
      if (p.life && p.life !== prev.utilisation.length) {
        const u = [...prev.utilisation];
        if (p.life > u.length) {
          const last = u[u.length - 1] ?? 0.7;
          while (u.length < p.life) u.push(last);
        } else {
          u.length = p.life;
        }
        next.utilisation = u;
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setInput(INITIAL), []);

  const metrics = useMemo(() => computeMetrics(input), [input]);
  const incremental = useMemo(
    () =>
      incrementalBuildVsBuy(input, {
        cloudRatePerHour: input.cloudRatePerHour,
        cloudFixedCost: input.cloudFixedCost,
      }),
    [input]
  );
  const verdict = useMemo(
    () => deriveVerdict({ metrics, incremental, wacc: input.discountRate, life: input.life }),
    [metrics, incremental, input.discountRate, input.life]
  );

  return (
    <div className="app">
      {/* ---------- Top nav ---------- */}
      <header className="nav">
        <div className="container nav__inner">
          <div className="nav__brand">
            <img src="/flame.svg" alt="" className="nav__logo" />
            <div>
              <div className="nav__title">PROMETHEUS</div>
              <div className="nav__sub mono">Nexus Intelligence · Capital Budgeting</div>
            </div>
          </div>
          <div className="nav__actions">
            <span className="chip">USD · UAE 9% tax</span>
            <a className="btn" href="#results">View results ↓</a>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero__orb" aria-hidden />
        <div className="container hero__inner">
          <motion.div
            className="chip hero__chip"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            ⚡ CAPITAL INVESTMENT APPRAISAL
          </motion.div>
          <motion.h1
            className="hero__title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
          >
            Should we forge our own <span className="grad-text">intelligence</span>,
            <br />
            or rent it?
          </motion.h1>
          <motion.p
            className="hero__lede"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            A full capital-budgeting appraisal of building an on-premise GPU inference cluster
            versus renting equivalent cloud capacity — 13 investment measures, sensitivity &
            scenario analysis, and an AI-assisted recommendation.
          </motion.p>
        </div>
      </section>

      {/* ---------- Workbench ---------- */}
      <main id="results" className="container workbench">
        <InputForm input={input} patch={patch} onReset={reset} />
        <div className="workbench__results">
          <VerdictBanner verdict={verdict} metrics={metrics} wacc={input.discountRate} />
          <Dashboard metrics={metrics} incremental={incremental} input={input} />
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <span className="mono dim">Project PROMETHEUS · Corporate Finance</span>
          <span className="mono dim">Kartik Joshi · Masters in AI with Business</span>
        </div>
      </footer>
    </div>
  );
}
