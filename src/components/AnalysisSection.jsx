import ChartFrame from './charts/ChartFrame.jsx';
import Waterfall from './charts/Waterfall.jsx';
import Tornado from './charts/Tornado.jsx';
import ScenarioBars from './charts/ScenarioBars.jsx';
import Gauge from './charts/Gauge.jsx';
import BuildVsBuy from './BuildVsBuy.jsx';
import { fmtUSD, fmtYears } from '../lib/format.js';

export default function AnalysisSection({ metrics, sensitivity, scenarios, build, buy, small, incremental, wacc }) {
  return (
    <section className="section analysis">
      <div className="section-head">
        <div className="section-head__eyebrow">DEEPER ANALYSIS</div>
        <h2 className="section-head__title">Timeline, risk &amp; alternatives</h2>
        <p className="section-head__sub muted">
          The cash-flow recovery path, one-at-a-time sensitivity, best/base/worst scenarios, return
          margins over the hurdle rate, and the head-to-head build-versus-buy decision.
        </p>
      </div>

      <div className="analysis-grid">
        <ChartFrame
          className="span-2"
          title="Cash-flow timeline"
          sub="Net cash flow each period (bars) with the cumulative running total (line). Payback is where the line first crosses zero."
          badge={`Payback ${fmtYears(metrics.payback)}`}
        >
          <Waterfall cashflows={metrics.cashflows} />
          <div className="chart-legend">
            <span><i style={{ background: 'var(--cyan)' }} /> Inflow</span>
            <span><i style={{ background: 'var(--magenta)' }} /> Outflow</span>
            <span><i style={{ background: 'var(--amber)' }} /> Cumulative</span>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Sensitivity — tornado"
          sub="NPV impact of a ±20% move in each driver, largest swing first. Bars crossing the dashed line turn NPV negative."
          badge={`base ${fmtUSD(sensitivity.baseNpv)}`}
        >
          <Tornado sensitivity={sensitivity} />
        </ChartFrame>

        <ChartFrame
          title="Scenario analysis"
          sub="Simultaneous driver bundles for worst, base and best cases — the decision flips across them."
        >
          <ScenarioBars scenarios={scenarios} />
        </ChartFrame>

        <ChartFrame title="IRR vs hurdle" sub="Internal rate of return against the cost of capital.">
          <Gauge value={metrics.irr} hurdle={wacc} label="IRR" />
        </ChartFrame>

        <ChartFrame title="MIRR vs hurdle" sub="Modified IRR — the more conservative reinvestment-adjusted return.">
          <Gauge value={metrics.mirr} hurdle={wacc} label="MIRR" />
        </ChartFrame>

        <ChartFrame
          className="span-2"
          title="Build vs Buy vs Small-tier"
          sub="The core alternative comparison. Standalone NPV of each option, plus the rigorous incremental Build−Buy decision (revenue is common, so it isolates capex vs opex)."
        >
          <BuildVsBuy build={build} buy={buy} small={small} incremental={incremental} wacc={wacc} />
        </ChartFrame>
      </div>
    </section>
  );
}
