import ChartFrame from './charts/ChartFrame.jsx';
import Waterfall from './charts/Waterfall.jsx';
import Tornado from './charts/Tornado.jsx';
import ScenarioBars from './charts/ScenarioBars.jsx';
import Gauge from './charts/Gauge.jsx';
import { fmtMoney, fmtYears } from '../lib/format.js';

export default function AnalysisSection({ metrics, sensitivity, scenarios, wacc }) {
  return (
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
        badge={`base ${fmtMoney(sensitivity.baseNpv)}`}
      >
        <Tornado sensitivity={sensitivity} />
      </ChartFrame>

      <ChartFrame
        title="Scenario analysis"
        sub="Simultaneous driver bundles for worst, base and best cases — the decision can flip across them."
      >
        <ScenarioBars scenarios={scenarios} />
      </ChartFrame>

      <ChartFrame title="IRR vs required return" sub="Internal rate of return against the hurdle rate.">
        <Gauge value={metrics.irr} hurdle={wacc} label="IRR" />
      </ChartFrame>

      <ChartFrame title="MIRR vs required return" sub="The more conservative reinvestment-adjusted return.">
        <Gauge value={metrics.mirr} hurdle={wacc} label="MIRR" />
      </ChartFrame>
    </div>
  );
}
