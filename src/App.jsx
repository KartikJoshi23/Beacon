import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { computeMetrics, sensitivity as computeSensitivity, scenarioAnalysis, compareAlternatives } from './lib/finance.js';
import { deriveVerdict } from './lib/verdict.js';
import { generateInsight } from './lib/insight.js';
import { BASE_CASE, ALTERNATIVES, SCENARIO_BUNDLES, COMPANY, LOCATION_A } from './data/scenario.js';
import Nav from './components/Nav.jsx';
import InputForm from './components/InputForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import VerdictBanner from './components/VerdictBanner.jsx';
import AnalysisSection from './components/AnalysisSection.jsx';
import AlternativesCompare from './components/AlternativesCompare.jsx';
import AIInsight from './components/AIInsight.jsx';
import FloatingChat from './components/FloatingChat.jsx';
import HeroScene from './components/HeroScene.jsx';
import './App.css';

function SectionHead({ eyebrow, title, sub }) {
  return (
    <div className="section-head">
      <div className="section-head__eyebrow">{eyebrow}</div>
      <h2 className="section-head__title">{title}</h2>
      {sub && <p className="section-head__sub muted">{sub}</p>}
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState(BASE_CASE);
  const [tab, setTab] = useState('overview');
  const [preset, setPreset] = useState('A');

  const patch = useCallback((p) => setInput((prev) => ({ ...prev, ...p })), []);
  const reset = useCallback(() => {
    setInput(LOCATION_A.input);
    setPreset('A');
  }, []);
  const loadPreset = useCallback((loc) => {
    setInput(loc.input);
    setPreset(loc.key);
  }, []);

  const metrics = useMemo(() => computeMetrics(input), [input]);
  const sensitivity = useMemo(() => computeSensitivity(input, { pct: 0.2 }), [input]);
  const scenarios = useMemo(() => scenarioAnalysis(input, SCENARIO_BUNDLES), [input]);
  const comparison = useMemo(() => compareAlternatives(ALTERNATIVES), []);

  const currentName = useMemo(() => ALTERNATIVES.find((a) => a.key === preset)?.name ?? 'Current scenario', [preset]);
  const verdict = useMemo(
    () => deriveVerdict({ metrics, best: comparison.best, wacc: input.discountRate, life: input.life, currentName }),
    [metrics, comparison, input.discountRate, input.life, currentName]
  );
  const insight = useMemo(
    () => generateInsight({ metrics, comparison, sensitivity, input, verdict, currentName }),
    [metrics, comparison, sensitivity, input, verdict, currentName]
  );

  return (
    <div className="app">
      <Nav active={tab} setActive={setTab} verdict={verdict} metrics={metrics} />

      <main className="main">
        <div className="container">
          <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'overview' && (
                <section className="overview">
                  <div className="hero">
                    <HeroScene />
                    <div className="hero__content">
                      <motion.div className="chip hero__chip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        ☕ CAPITAL INVESTMENT APPRAISAL
                      </motion.div>
                      <motion.h1 className="hero__title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}>
                        Which new <span className="grad-text">branch</span> should
                        <br /> we open?
                      </motion.h1>
                      <motion.p className="hero__lede" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}>
                        {COMPANY.name} — {COMPANY.sector}, {COMPANY.city} — is weighing three candidate sites for its
                        next outlet. This tool runs the full capital-budgeting appraisal on each: 13 investment
                        measures, sensitivity &amp; scenario analysis, and an AI-assisted recommendation.
                      </motion.p>
                      <div className="hero__chips">
                        <span className="chip">AED · UAE 9% tax</span>
                        <span className="chip">3 candidate sites</span>
                        <span className="chip">6-year horizon</span>
                      </div>
                    </div>
                  </div>

                  <VerdictBanner verdict={verdict} metrics={metrics} wacc={input.discountRate} />

                  <div className="cta-row">
                    <button className="btn btn-primary" onClick={() => setTab('results')}>See full results →</button>
                    <button className="btn" onClick={() => setTab('alternatives')}>Compare the sites</button>
                    <button className="btn" onClick={() => setTab('inputs')}>Edit assumptions</button>
                  </div>
                </section>
              )}

              {tab === 'inputs' && (
                <section>
                  <SectionHead
                    eyebrow="ASSUMPTIONS"
                    title="Enter the project inputs"
                    sub="Everything a capital-budgeting appraisal needs — enter values directly, or load a candidate site to start. Results update live across every tab."
                  />
                  <InputForm input={input} patch={patch} onReset={reset} activePreset={preset} onPreset={loadPreset} variant="page" />
                </section>
              )}

              {tab === 'results' && (
                <section>
                  <SectionHead
                    eyebrow={`RESULTS · ${currentName.toUpperCase()}`}
                    title="The 13 capital-budgeting measures"
                    sub="Every required output, computed client-side and independently verified. Currency in AED."
                  />
                  <VerdictBanner verdict={verdict} metrics={metrics} wacc={input.discountRate} />
                  <Dashboard metrics={metrics} input={input} />
                </section>
              )}

              {tab === 'analysis' && (
                <section>
                  <SectionHead
                    eyebrow="DEEPER ANALYSIS"
                    title="Timeline, sensitivity &amp; scenarios"
                    sub="The cash-flow recovery path, one-at-a-time sensitivity, worst/base/best scenarios, and return margins over the hurdle rate."
                  />
                  <AnalysisSection metrics={metrics} sensitivity={sensitivity} scenarios={scenarios} wacc={input.discountRate} />
                </section>
              )}

              {tab === 'alternatives' && (
                <section>
                  <SectionHead
                    eyebrow="COMPARE ALTERNATIVES"
                    title="Which of the three sites wins?"
                    sub="The candidate outlets are mutually exclusive — only one branch opens — so they are ranked by NPV, the value-maximising criterion."
                  />
                  <AlternativesCompare comparison={comparison} wacc={input.discountRate} />
                </section>
              )}

              {tab === 'ai' && (
                <section>
                  <SectionHead
                    eyebrow="AI INSIGHT"
                    title="Plain-language insight &amp; recommendation"
                    sub="An AI reading of the numbers — explanation, risks, alternative comparison and a final Accept / Reject / Delay / Review verdict. Use the floating ✦ Advisor (bottom-right) to ask follow-up questions on any tab."
                  />
                  <AIInsight insight={insight} />
                </section>
              )}
            </motion.div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <span className="mono dim">Project BEACON · Corporate Finance</span>
          <span className="mono dim">Kartik Joshi · Masters in AI with Business</span>
        </div>
      </footer>

      <FloatingChat
        activeTab={tab}
        input={input}
        metrics={metrics}
        comparison={comparison}
        sensitivity={sensitivity}
        scenarios={scenarios}
        currentName={currentName}
        verdict={verdict}
      />
    </div>
  );
}
