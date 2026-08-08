import { fmtMoney } from '../lib/format.js';
import { ALTERNATIVES } from '../data/scenario.js';
import './InputForm.css';

/** Labeled numeric field. `pct` fields store decimals but display as %. */
function Field({ label, value, onChange, unit, step = 1, pct = false, hint, min }) {
  const shown = pct ? +(value * 100).toFixed(4) : value;
  return (
    <div className="field">
      <label>
        {label}
        {hint && (
          <span className="field__hint" title={hint}>
            ?
          </span>
        )}
      </label>
      <div className="field__control">
        {unit && <span className="field__unit">{unit}</span>}
        <input
          type="number"
          className={unit ? 'has-unit' : ''}
          value={Number.isFinite(shown) ? shown : ''}
          step={step}
          min={min}
          onChange={(e) => {
            const raw = e.target.value === '' ? 0 : parseFloat(e.target.value);
            onChange(pct ? raw / 100 : raw);
          }}
        />
        {pct && <span className="field__suffix">%</span>}
      </div>
    </div>
  );
}

function Group({ title, accent, children }) {
  return (
    <div className="ingroup" style={{ '--g-accent': accent }}>
      <div className="ingroup__title">
        <span className="ingroup__dot" />
        {title}
      </div>
      <div className="ingroup__grid">{children}</div>
    </div>
  );
}

export default function InputForm({ input, patch, onReset, activePreset, onPreset, variant = 'page' }) {
  const depBase = (input.initialInvestment || 0) + (input.installTransport || 0);
  const annualDep = (depBase - (input.salvage || 0)) / (input.life || 1);

  return (
    <aside className={`inputform glass hairline inputform--${variant}`}>
      <div className="inputform__header">
        <div>
          <div className="inputform__eyebrow mono">INPUT DECK</div>
          <h3>Project assumptions</h3>
        </div>
        <button className="btn inputform__reset" onClick={onReset} title="Restore Location A">
          ↺ Reset
        </button>
      </div>

      {/* Location presets */}
      <div className="preset-row">
        <span className="preset-row__label mono">Load a candidate:</span>
        <div className="preset-row__btns">
          {ALTERNATIVES.map((a) => (
            <button
              key={a.key}
              className={`preset-btn ${activePreset === a.key ? 'preset-btn--active' : ''}`}
              onClick={() => onPreset(a)}
              title={a.blurb}
            >
              {a.key}
            </button>
          ))}
        </div>
      </div>

      <div className="inputform__body">
        <Group title="Project & capital outlay" accent="var(--amber)">
          <Field label="Project life" unit="yr" step={1} min={1} value={input.life} onChange={(v) => patch({ life: Math.max(1, Math.round(v)) })} />
          <Field label="Initial investment" unit="AED" step={10000} value={input.initialInvestment} onChange={(v) => patch({ initialInvestment: v })} hint="Fit-out, equipment & furniture" />
          <Field label="Installation & transport" unit="AED" step={5000} value={input.installTransport} onChange={(v) => patch({ installTransport: v })} hint="Setup, signage, freight" />
          <Field label="Working capital" unit="AED" step={5000} value={input.workingCapital} onChange={(v) => patch({ workingCapital: v })} hint="Inventory + deposits + float; recovered at end" />
          <Field label="Sunk cost (excluded)" unit="AED" step={5000} value={input.sunkCost} onChange={(v) => patch({ sunkCost: v })} hint="Feasibility/market study already paid — shown but excluded from cash flows" />
        </Group>

        <Group title="Revenue" accent="var(--cyan)">
          <Field label="Annual revenue (year 1)" unit="AED" step={50000} value={input.revenueYear1} onChange={(v) => patch({ revenueYear1: v })} hint="Expected first-year sales" />
          <Field label="Revenue growth / yr" pct step={0.5} value={input.revenueGrowth} onChange={(v) => patch({ revenueGrowth: v })} hint="Same-store sales growth" />
        </Group>

        <Group title="Operating costs" accent="var(--violet)">
          <Field label="Fixed cost / yr" unit="AED" step={10000} value={Array.isArray(input.fixedCost) ? input.fixedCost[0] : input.fixedCost} onChange={(v) => patch({ fixedCost: v })} hint="Rent, salaries, utilities, marketing" />
          <Field label="Fixed cost growth / yr" pct step={0.5} value={input.fixedGrowth} onChange={(v) => patch({ fixedGrowth: v })} hint="Rent & wage escalation" />
          <Field label="Variable cost (% of sales)" pct step={1} value={input.variableCostPct} onChange={(v) => patch({ variableCostPct: v })} hint="COGS, packaging, card/aggregator fees" />
        </Group>

        <Group title="Depreciation · tax · salvage" accent="var(--emerald)">
          <Field label="Salvage value" unit="AED" step={5000} value={input.salvage} onChange={(v) => patch({ salvage: v })} hint="Resale of fixtures at end of life" />
          <Field label="Tax rate" pct step={0.5} value={input.tax} onChange={(v) => patch({ tax: v })} hint="UAE corporate tax" />
          <Field label="Opportunity cost / yr" unit="AED" step={2000} value={input.opportunityCostAnnual} onChange={(v) => patch({ opportunityCostAnnual: v })} hint="Foregone alternative use — a relevant cost" />
          <div className="field field--readout">
            <label>Depreciation (SL)</label>
            <div className="field__readout mono">{fmtMoney(annualDep)}/yr</div>
          </div>
        </Group>

        <Group title="Required return" accent="var(--blue)">
          <Field label="Required return (WACC)" pct step={0.5} value={input.discountRate} onChange={(v) => patch({ discountRate: v })} />
          <Field label="Reinvestment rate" pct step={0.5} value={input.reinvestRate} onChange={(v) => patch({ reinvestRate: v })} hint="Used for MIRR" />
        </Group>
      </div>
    </aside>
  );
}
