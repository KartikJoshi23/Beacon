import { motion } from 'framer-motion';
import MetricCard from './MetricCard.jsx';
import { fmtMoney, fmtMoneyCompact, fmtPct, fmtX, fmtYears } from '../lib/format.js';
import './Dashboard.css';

export default function Dashboard({ metrics, input }) {
  const wacc = input.discountRate;
  const life = input.life;
  const m = metrics;

  const cards = [
    {
      label: 'Net Present Value',
      value: m.npv,
      format: (v) => fmtMoneyCompact(v),
      tone: m.npv > 0 ? 'pos' : 'neg',
      sub: fmtMoney(m.npv),
      hint: 'PV of all cash flows minus the initial outlay. > 0 creates value.',
      big: true,
    },
    {
      label: 'Internal Rate of Return',
      value: m.irr,
      format: (v) => fmtPct(v),
      tone: m.irr > wacc ? 'pos' : 'neg',
      sub: `hurdle ${fmtPct(wacc)}`,
      hint: 'Discount rate at which NPV = 0. Accept if IRR > required return.',
      big: true,
    },
    {
      label: 'MIRR',
      value: m.mirr,
      format: (v) => fmtPct(v),
      tone: m.mirr > wacc ? 'pos' : 'neg',
      hint: 'Modified IRR — assumes reinvestment at the required return.',
    },
    {
      label: 'Profitability Index',
      value: m.profitabilityIndex,
      format: (v) => fmtX(v),
      tone: m.profitabilityIndex > 1 ? 'pos' : 'neg',
      hint: 'PV of inflows ÷ initial outlay. > 1 means value-accretive.',
    },
    {
      label: 'Payback Period',
      value: m.payback,
      format: (v) => fmtYears(v),
      tone: m.payback != null && m.payback <= life ? 'pos' : 'warn',
      hint: 'Years to recover the initial outlay (undiscounted).',
    },
    {
      label: 'Discounted Payback',
      value: m.discountedPayback,
      format: (v) => fmtYears(v),
      tone: m.discountedPayback != null && m.discountedPayback <= life ? 'pos' : 'neg',
      hint: 'Payback using discounted cash flows — always ≥ plain payback.',
    },
    {
      label: 'Accounting Rate of Return',
      value: m.arr.onAverageInvestment,
      format: (v) => fmtPct(v),
      tone: 'neutral',
      accent: 'var(--violet)',
      sub: `avg profit ${fmtMoneyCompact(m.arr.avgProfit)}`,
      hint: 'Average after-tax profit ÷ average investment.',
    },
    {
      label: 'Initial Cash Flow',
      value: m.initialCashFlow,
      format: (v) => fmtMoneyCompact(v),
      tone: 'neutral',
      accent: 'var(--amber)',
      sub: fmtMoney(m.initialCashFlow),
      hint: 'Initial investment + install/transport + working capital (sunk cost excluded).',
    },
    {
      label: 'Terminal-Year Cash Flow',
      value: m.terminalCashFlow,
      format: (v) => fmtMoneyCompact(v),
      tone: 'neutral',
      accent: 'var(--emerald)',
      sub: 'after-tax salvage + WC recovery',
      hint: 'Added on top of the final year’s operating cash flow.',
    },
    {
      label: 'Break-even Revenue',
      value: m.breakEven.revenue,
      format: (v) => fmtMoneyCompact(v),
      tone: 'warn',
      accent: 'var(--amber)',
      sub: `${fmtPct(m.breakEven.pctOfYear1)} of yr-1 sales`,
      hint: 'Year-1 revenue at which accounting profit = 0.',
    },
  ];

  const ocfs = m.annualOperatingCashFlows;
  const maxOcf = Math.max(...ocfs.map((x) => Math.abs(x)), 1);

  return (
    <section className="dashboard">
      <div className="dashboard__grid">
        {cards.map((c, i) => (
          <MetricCard key={c.label} index={i} {...c} />
        ))}

        <motion.div
          className="ocf-strip glass hairline"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ocf-strip__label">Annual Operating Cash Flows</div>
          <div className="ocf-strip__bars">
            {ocfs.map((v, i) => (
              <div className="ocf-bar" key={i}>
                <div className="ocf-bar__val mono">{fmtMoneyCompact(v)}</div>
                <div className="ocf-bar__track">
                  <motion.div
                    className="ocf-bar__fill"
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(Math.abs(v) / maxOcf) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="ocf-bar__yr mono">Y{i + 1}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
