import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Account } from '../api';
import { ago, BILLING_NAMES, dateText, licenseBadge, planName } from '../format';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Empty, Field, Icon, LoadState, useLoad, useSave } from '../ui';

type Filter = 'all' | 'active' | 'suspended' | 'expiring' | 'readOnly' | 'trial';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'readOnly', label: 'Read-only' },
  { key: 'trial', label: 'Trial' },
];

const keep: Record<Filter, (a: Account) => boolean> = {
  all: () => true,
  active: (a) => a.status === 'active',
  suspended: (a) => a.status === 'suspended',
  expiring: (a) => a.license.state === 'expiring' || a.license.state === 'grace',
  readOnly: (a) => a.license.state === 'expired',
  trial: (a) => a.plan === 'trial',
};

export function Accounts() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const state = useLoad(() => api.accounts(q), [q]);
  const rows = state.data?.dealers.filter(keep[filter]) ?? [];
  const counts = state.data?.counts;

  return (
    <Page
      title="Accounts"
      sub={counts ? `${counts.all} ${counts.all === 1 ? 'account' : 'accounts'}${q ? ` matching “${q}”` : ''}` : undefined}
      actions={<button type="button" className="mb-btn mb-btn--primary" onClick={() => setAdding(true)}><Icon name="plus" />New account</button>}
    >
      <div className="toolbar">
        <div className="row-c" role="group" aria-label="Filter accounts">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={`chip${filter === f.key ? ' is-on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label} {counts && <span className="count">{counts[f.key]}</span>}
            </button>
          ))}
        </div>
        {q && <button type="button" className="chip" onClick={() => setParams({})}>Clear search “{q}”</button>}
      </div>

      <LoadState state={state}>
        {rows.length === 0 ? (
          <Empty>{q || filter !== 'all' ? 'No account matches. Try another filter or search.' : 'No accounts yet. Add the first one, or turn a demo request into a trial account.'}</Empty>
        ) : (
          <div className="mb-table-wrap tbl-scroll">
            <table className="mb-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Plan</th>
                  <th className="num">Computers</th>
                  <th>Licence</th>
                  <th>Last seen</th>
                  <th>Last payment</th>
                  <th><span className="visually-hidden">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const b = licenseBadge(d.license, d.plan === 'trial');
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="cell-name"><Link to={`/accounts/${d.id}`}>{d.name}</Link></span>
                        <span className="caption">{[d.city, d.ownerName].filter(Boolean).join(' · ') || 'No details yet'}</span>
                      </td>
                      <td>{planName(d.plan)}<span className="caption">{BILLING_NAMES[d.billing]}</span></td>
                      <td className="num">{d.deviceCount}</td>
                      <td><Badge tone={b.tone}>{b.text}</Badge><span className="caption">until {dateText(d.licenseValidUntil)}</span></td>
                      <td>{ago(d.lastSeenAt)}</td>
                      <td>{d.lastPaidOn ? dateText(d.lastPaidOn) : <span className="muted">None yet</span>}</td>
                      <td><Link to={`/accounts/${d.id}`} className="link-btn">Open<span className="visually-hidden"> {d.name}</span></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </LoadState>
      {adding && <NewAccountDialog onClose={() => setAdding(false)} />}
    </Page>
  );
}

function NewAccountDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const plans = useLoad(api.plans, []);
  const save = useSave();
  const [f, setF] = useState({ name: '', ownerName: '', phone: '', city: '', email: '', plan: 'standard', billing: 'license' as 'license' | 'monthly', until: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => {
      const made = await api.createAccount({
        name: f.name,
        ownerName: f.ownerName || null,
        phone: f.phone || null,
        city: f.city || null,
        email: f.email || null,
        plan: f.plan,
        billing: f.billing,
        ...(f.until ? { licenseValidUntil: f.until } : {}),
      });
      navigate(`/accounts/${made.dealer.id}`);
    });
  }

  return (
    <Dialog title="New account" onClose={onClose}>
      <form className="col" onSubmit={submit}>
        <Field label="Shop name">{(id) => <input id={id} className="mb-input" value={f.name} onChange={set('name')} maxLength={120} required />}</Field>
        <div className="form-row">
          <Field label="Owner name">{(id) => <input id={id} className="mb-input" value={f.ownerName} onChange={set('ownerName')} autoComplete="off" />}</Field>
          <Field label="Mobile">{(id) => <input id={id} className="mb-input" type="tel" value={f.phone} onChange={set('phone')} placeholder="0300 1234567" />}</Field>
          <Field label="City">{(id) => <input id={id} className="mb-input" value={f.city} onChange={set('city')} />}</Field>
          <Field label="Email">{(id) => <input id={id} className="mb-input" type="email" value={f.email} onChange={set('email')} />}</Field>
        </div>
        <div className="form-row">
          <Field label="Plan">
            {(id) => (
              <select id={id} className="sel" value={f.plan} onChange={set('plan')}>
                {(plans.data?.plans.filter((p) => p.enabled) ?? [{ id: 'standard', name: 'Standard' }]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Billing">
            {(id) => (
              <select id={id} className="sel" value={f.billing} onChange={set('billing')}>
                <option value="license">Licence</option>
                <option value="monthly">Monthly subscription</option>
              </select>
            )}
          </Field>
        </div>
        <Field label="Licence valid until" hint={f.plan === 'trial' ? 'Leave empty for a 14-day trial.' : 'The last day the app works without a grace period.'}>
          {(id, d) => <input id={id} aria-describedby={d} className="mb-input" type="date" value={f.until} onChange={set('until')} required={f.plan !== 'trial'} />}
        </Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Add account'}</button>
        </div>
      </form>
    </Dialog>
  );
}
