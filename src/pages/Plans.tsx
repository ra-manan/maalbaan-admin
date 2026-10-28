import { useState } from 'react';
import { api, type Plan } from '../api';
import { useAuth } from '../auth';
import { pkr } from '../format';
import { Page } from '../Shell';
import { LoadState, messageOf, useLoad } from '../ui';

export function Plans() {
  const { admin } = useAuth();
  const state = useLoad(api.plans, []);
  return (
    <Page title="Plans and prices" sub={admin.role === 'owner' ? 'Prices feed the monthly revenue figure on the dashboard' : 'Only an owner can change prices'}>
      <LoadState state={state}>
        <div className="mb-table-wrap tbl-scroll">
          <table className="mb-table">
            <thead><tr><th>Plan</th><th className="num">Users</th><th className="num">Monthly price</th><th className="num">Yearly price</th>{admin.role === 'owner' && <th><span className="visually-hidden">Save</span></th>}</tr></thead>
            <tbody>
              {state.data?.plans.map((p) => <PlanRow key={p.id} plan={p} editable={admin.role === 'owner'} onSaved={(plans) => state.setData({ plans })} />)}
            </tbody>
          </table>
        </div>
        <p className="caption">Prices are shown in PKR. Leave a price empty if you have not decided it yet. Users is how many people the plan allows.</p>
      </LoadState>
    </Page>
  );
}

function PlanRow({ plan, editable, onSaved }: { plan: Plan; editable: boolean; onSaved: (plans: Plan[]) => void }) {
  const [monthly, setMonthly] = useState(plan.monthly_price_pkr?.toString() ?? '');
  const [yearly, setYearly] = useState(plan.yearly_price_pkr?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = monthly !== (plan.monthly_price_pkr?.toString() ?? '') || yearly !== (plan.yearly_price_pkr?.toString() ?? '');
  const toValue = (s: string) => (s.trim() === '' ? null : Number(s));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      onSaved((await api.updatePlan(plan.id, { monthlyPricePkr: toValue(monthly), yearlyPricePkr: toValue(yearly) })).plans);
      setMsg({ ok: true, text: 'Saved' });
    } catch (e) {
      setMsg({ ok: false, text: messageOf(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="cell-name">{plan.name}{msg && <span className={`caption ${msg.ok ? '' : 'mb-error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</span>}</td>
      <td className="num">{plan.max_users}</td>
      {editable ? (
        <>
          <td className="num"><input className="mb-input num" style={{ width: 130 }} type="number" min={0} step={1} aria-label={`${plan.name} monthly price`} placeholder="Not set" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></td>
          <td className="num"><input className="mb-input num" style={{ width: 130 }} type="number" min={0} step={1} aria-label={`${plan.name} yearly price`} placeholder="Not set" value={yearly} onChange={(e) => setYearly(e.target.value)} /></td>
          <td><button type="button" className="mb-btn mb-btn--secondary" disabled={!dirty || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></td>
        </>
      ) : (
        <>
          <td className="num">{plan.monthly_price_pkr == null ? <span className="muted">Not set</span> : pkr(plan.monthly_price_pkr)}</td>
          <td className="num">{plan.yearly_price_pkr == null ? <span className="muted">Not set</span> : pkr(plan.yearly_price_pkr)}</td>
        </>
      )}
    </tr>
  );
}
