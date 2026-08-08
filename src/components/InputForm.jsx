import { useState } from 'react';
import './InputForm.css';

/** Labeled numeric field. `pct` fields store decimals but display as %. */
function Field({ label, value, onChange, unit, step = 1, pct = false, hint, min }) {
  const shown = pct ? +(value * 100).toFixed(4) : value;
  return (
    <div className="field">
      <label>
        {label}
        {hint && <span className="field__hint" title={hint}>?</span>}
      </label>
      <div className="field__control">
        {unit && <span className="field__unit">{unit}</span>}
        <input
          type="number"
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

export default function InputForm({ input, patch, onReset }) {
  const [open, setOpen] = useState(true);
  const setUtil = (i, v) => {
    const u = [...input.utilisation];
    u[i] = v / 100;
    patch({ utilisation: u });
  };

  return (
    <aside className="inputform glass hairline">
      <div className="inputform__header">
        <div>
          <div className="inputform__eyebrow mono">INPUT DECK</div>
          <h3>Assumptions</h3>
        </div>
        <button className="btn inputform__reset" onClick={onReset} title="Restore base case">
          ↺ Reset
        </button>
      </div>

      <div className={`inputform__body ${open ? '' : 'collapsed'}`}>
        <Group title="Capital Outlay" accent="var(--cyan)">
          <Field label="Equipment cost" unit="$" step={10000} value={input.equipment} onChange={(v) => patch({ equipment: v })} />
          <Field label="Installation" unit="$" step={5000} value={input.installation} onChange={(v) => patch({ installation: v })} />
          <Field label="Transportation" unit="$" step={5000} value={input.transportation} onChange={(v) => patch({ transportation: v })} />
          <Field label="Working capital" unit="$" step={5000} value={input.workingCapital} onChange={(v) => patch({ workingCapital: v })} hint="Recovered in full at end of life" />
          <Field label="Sunk cost (excluded)" unit="$" step={5000} value={input.sunkCost} onChange={(v) => patch({ sunkCost: v })} hint="Feasibility study already paid — shown but excluded from cash flows" />
        </Group>

        <Group title="Operating Model" accent="var(--violet)">
          <Field label="Project life" unit="yr" step={1} min={1} value={input.life} onChange={(v) => patch({ life: Math.max(1, Math.round(v)) })} />
          <Field label="Price / GPU-hr" unit="$" step={0.1} value={input.price} onChange={(v) => patch({ price: v })} />
          <Field label="Capacity hrs / yr" unit="h" step={1000} value={input.capacityHours} onChange={(v) => patch({ capacityHours: v })} />
          <Field label="Variable $/GPU-hr" unit="$" step={0.01} value={input.varCostPerHour} onChange={(v) => patch({ varCostPerHour: v })} hint="Electricity + cooling + variable maintenance" />
          <Field label="Fixed cost / yr" unit="$" step={10000} value={Array.isArray(input.fixedCost) ? input.fixedCost[0] : input.fixedCost} onChange={(v) => patch({ fixedCost: v })} hint="Staff, colocation, bandwidth, insurance" />
        </Group>

        <div className="ingroup util" style={{ '--g-accent': 'var(--amber)' }}>
          <div className="ingroup__title">
            <span className="ingroup__dot" />
            Utilisation by year
          </div>
          <div className="util__row">
            {input.utilisation.map((u, i) => (
              <div className="util__cell" key={i}>
                <label>Y{i + 1}</label>
                <div className="field__control">
                  <input type="number" step={1} value={+(u * 100).toFixed(2)} onChange={(e) => setUtil(i, e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                  <span className="field__suffix">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Group title="Depreciation · Tax · Salvage" accent="var(--emerald)">
          <Field label="Salvage value" unit="$" step={5000} value={input.salvage} onChange={(v) => patch({ salvage: v })} />
          <Field label="Tax rate" pct step={0.5} value={input.tax} onChange={(v) => patch({ tax: v })} hint="UAE corporate tax" />
          <Field label="Opportunity cost / yr" unit="$" step={2000} value={input.opportunityCostAnnual} onChange={(v) => patch({ opportunityCostAnnual: v })} hint="Foregone alternative use — relevant cost" />
        </Group>

        <Group title="Cost of Capital" accent="var(--blue)">
          <Field label="WACC (discount rate)" pct step={0.5} value={input.discountRate} onChange={(v) => patch({ discountRate: v })} />
          <Field label="Reinvestment rate" pct step={0.5} value={input.reinvestRate} onChange={(v) => patch({ reinvestRate: v })} hint="Used for MIRR" />
        </Group>

        <Group title="Cloud Alternative (Buy)" accent="var(--magenta)">
          <Field label="Cloud rate / GPU-hr" unit="$" step={0.1} value={input.cloudRatePerHour} onChange={(v) => patch({ cloudRatePerHour: v })} hint="All-in committed-use rental cost" />
          <Field label="Cloud fixed cost / yr" unit="$" step={5000} value={input.cloudFixedCost} onChange={(v) => patch({ cloudFixedCost: v })} />
        </Group>
      </div>
    </aside>
  );
}
