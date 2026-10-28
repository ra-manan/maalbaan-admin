import { useState } from 'react';
import { api, type Plan } from '../api';
import { useAuth } from '../auth';
import { pkr } from '../format';
import { Page } from '../Shell';
import { Badge, LoadState, messageOf, useLoad } from '../ui';

export function Plans() {
  const { admin } = useAuth();
  const state = useLoad(api.plans, []);
  return (
    <Page title="Plans and prices" sub={admin.role === 'owner' ? 'Monthly prices feed the monthly revenue figure on the dashboard' : 'Only an owner can change prices'}>
      <LoadState state={state}>
        <div className="mb-table-wrap tbl-scroll">
          <table className="mb-table">
            <thead><tr><th>Plan</th><th className="num">Users</th><th className="num">Licence fee (one time)</th><th className="num">Monthly fee</th><th>Status</th>{admin.role === 'owner' && <th><span className="visually-hidden">Save</span></th>}</tr></thead>
            <tbody>
              {state.data?.plans.map((p) => <PlanRow key={p.id} plan={p} editable={admin.role === 'owner'} onSaved={(plans) => state.setData({ plans })} />)}
            </tbody>
          </table>
        </div>
        <p className="caption">Prices are shown in PKR. Each account pays the licence fee once, then the monthly fee. Leave a price empty if you have not decided it yet. A plan that is off keeps its current accounts but cannot be given to new ones. Users is how many people the plan allows.</p>
      </LoadState>
    </Page>
  );
}

function PlanRow({ plan, editable, onSaved }: { plan: Plan; editable: boolean; onSaved: (plans: Plan[]) => void }) {
  const [fee, setFee] = useState(plan.license_fee_pkr?.toString() ?? '');
  const [monthly, setMonthly] = useState(plan.monthly_price_pkr?.toString() ?? '');
  const [enabled, setEnabled] = useState(plan.enabled);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = fee !== (plan.license_fee_pkr?.toString() ?? '') || monthly !== (plan.monthly_price_pkr?.toString() ?? '') || enabled !== plan.enabled;
  const toValue = (s: string) => (s.trim() === '' ? null : Number(s));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      onSaved((await api.updatePlan(plan.id, { licenseFeePkr: toValue(fee), monthlyPricePkr: toValue(monthly), enabled })).plans);
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
          <td className="num"><input className="mb-input num" style={{ width: 130 }} type="number" min={0} step={1} aria-label={`${plan.name} licence fee`} placeholder="Not set" value={fee} onChange={(e) => setFee(e.target.value)} /></td>
          <td className="num"><input className="mb-input num" style={{ width: 130 }} type="number" min={0} step={1} aria-label={`${plan.name} monthly fee`} placeholder="Not set" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></td>
          <td>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 44, cursor: 'pointer' }}>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              {enabled ? 'On' : 'Off'}<span className="visually-hidden"> {plan.name} plan</span>
            </label>
          </td>
          <td><button type="button" className="mb-btn mb-btn--secondary" disabled={!dirty || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></td>
        </>
      ) : (
        <>
          <td className="num">{plan.license_fee_pkr == null ? <span className="muted">Not set</span> : pkr(plan.license_fee_pkr)}</td>
          <td className="num">{plan.monthly_price_pkr == null ? <span className="muted">Not set</span> : pkr(plan.monthly_price_pkr)}</td>
          <td><Badge tone={plan.enabled ? 'success' : 'neutral'}>{plan.enabled ? 'On' : 'Off'}</Badge></td>
        </>
      )}
    </tr>
  );
}
