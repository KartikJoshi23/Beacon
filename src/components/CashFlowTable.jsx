import { motion } from 'framer-motion';
import { fmtMoney } from '../lib/format.js';
import { fmtPct } from '../lib/format.js';
import './CashFlowTable.css';

/**
 * Full year-by-year cash-flow schedule — the audit trail a finance reviewer
 * expects: P&L build-up, OCF, terminal recovery, net cash flow, and its
 * present value, with NPV = the sum of the PV column.
 */
export default function CashFlowTable({ metrics, input }) {
  const rows = metrics.project.rows; // years 1..N
  const cf = metrics.cashflows; // [t0, ...tN]
  const r = input.discountRate;
  const term = metrics.project.terminalAdd;
  const N = rows.length;
  const df = (t) => 1 / Math.pow(1 + r, t);

  const data = [{ year: 't₀', net: cf[0], pv: cf[0], initial: true }];
  rows.forEach((row, i) => {
    const t = i + 1;
    data.push({
      year: `Y${t}`,
      revenue: row.revenue,
      variable: row.variable,
      fixed: row.fixed,
      dep: row.depreciation,
      ebit: row.ebit,
      tax: row.tax,
      ocf: row.ocf,
      terminal: t === N ? term : 0,
      net: cf[t],
      df: df(t),
      pv: cf[t] * df(t),
    });
  });
  const totalPV = data.reduce((s, d) => s + d.pv, 0); // == NPV

  const cols = ['Revenue', 'Variable', 'Fixed', 'Deprec.', 'EBIT', 'Tax', 'OCF', 'Terminal'];

  return (
    <motion.div
      className="cft glass hairline"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cft__head">
        <div>
          <div className="cft__eyebrow mono">AUDIT TRAIL</div>
          <h3 className="cft__title">Full cash-flow schedule</h3>
        </div>
        <span className="cft__badge mono">discounted at {fmtPct(r, 1)} · NPV = Σ PV</span>
      </div>
      <div className="cft__scroll">
        <table className="cft__table mono">
          <thead>
            <tr>
              <th className="cft__yr">Year</th>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>Net CF</th>
              <th>PV</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className={d.initial ? 'cft__t0row' : ''}>
                <td className="cft__yr">{d.year}</td>
                {d.initial ? (
                  <td colSpan={8} className="cft__dim">initial outlay (equipment + install + working capital)</td>
                ) : (
                  <>
                    <td>{fmtMoney(d.revenue)}</td>
                    <td>{fmtMoney(d.variable)}</td>
                    <td>{fmtMoney(d.fixed)}</td>
                    <td>{fmtMoney(d.dep)}</td>
                    <td>{fmtMoney(d.ebit)}</td>
                    <td>{fmtMoney(d.tax)}</td>
                    <td>{fmtMoney(d.ocf)}</td>
                    <td>{d.terminal ? fmtMoney(d.terminal) : '—'}</td>
                  </>
                )}
                <td className={d.net >= 0 ? 'text-pos' : 'text-neg'}>{fmtMoney(d.net)}</td>
                <td>{fmtMoney(d.pv)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="cft__yr" colSpan={10}>Net present value (sum of PV column)</td>
              <td className={totalPV >= 0 ? 'text-pos' : 'text-neg'}>{fmtMoney(totalPV)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
