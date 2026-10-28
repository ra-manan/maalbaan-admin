import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type AccountDetail as Detail, type AccountInput } from '../api';
import { addMonths, ago, BILLING_NAMES, dateText, dayTime, licenseBadge, PAYMENT_METHODS, phoneText, pkr, planName, whatsappDigits } from '../format';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Empty, Field, Icon, LoadState, messageOf, useCopy, useLoad, useSave } from '../ui';

type Dlg = null | 'edit' | 'payment' | 'code' | 'suspend';

export function AccountDetail() {
  const { id = '' } = useParams();
  const state = useLoad(() => api.account(id), [id]);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const d = state.data;

  /** Dialogs return the fresh account; show it and say what happened. */
  function saved(next: Detail, message: string) {
    state.setData(next);
    setProblem(null);
    setFlash(message);
    setDlg(null);
  }

  if (!d) {
    return (
      <Page title="Account" actions={<Link to="/accounts" className="link-btn"><Icon name="back" className="icon icon-sm" />All accounts</Link>}>
        <LoadState state={state}>{null}</LoadState>
      </Page>
    );
  }

  const a = d.dealer;
  const b = licenseBadge(a.license, a.plan === 'trial');
  const suspended = a.status === 'suspended';

  return (
    <Page
      title={a.name}
      sub={[a.city, `Added ${dateText(new Date(a.createdAt).toISOString())}`].filter(Boolean).join(' · ')}
      actions={
        <>
          <Link to="/accounts" className="link-btn"><Icon name="back" className="icon icon-sm" />All accounts</Link>
          <span className="spacer" />
          <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setDlg('edit')}>Edit details</button>
          <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setDlg('code')} disabled={suspended} title={suspended ? 'Reactivate the account first' : undefined}><Icon name="key" />Activation code</button>
          <button type="button" className="mb-btn mb-btn--primary" onClick={() => setDlg('payment')}><Icon name="card" />Record payment</button>
          {suspended ? (
            <button type="button" className="mb-btn mb-btn--secondary" onClick={() => void reactivate()}>Reactivate</button>
          ) : (
            <button type="button" className="mb-btn mb-btn--danger" onClick={() => setDlg('suspend')}>Suspend</button>
          )}
        </>
      }
    >
      {flash && <Alert tone="success" title={flash} />}
      {problem && <Alert tone="danger" title="Could not do that">{problem}</Alert>}
      {suspended && (
        <Alert tone="danger" title="This account is suspended">
          The app locks on every computer the next time it checks in. {a.suspendedReason ? `Reason: ${a.suspendedReason}` : 'No reason was written.'}
        </Alert>
      )}
      {!suspended && a.license.state === 'expired' && <Alert tone="danger" title="The licence ended and the grace period is over">The app is read-only. Record a payment and extend the date to open it again.</Alert>}
      {!suspended && a.license.state === 'grace' && <Alert tone="warning" title="The licence ended; the grace period is running">The app still works with a warning for {a.license.graceLeft} more {a.license.graceLeft === 1 ? 'day' : 'days'}.</Alert>}

      <div className="split">
        <div className="main">
          <section className="mb-card">
            <div className="card-head">
              <h2 className="h2">Licence and plan</h2>
              <Badge tone={b.tone}>{b.text}</Badge>
            </div>
            <dl className="kv">
              <dt>Plan</dt><dd>{planName(a.plan)}{d.plan ? ` · up to ${d.plan.max_users} users` : ''}</dd>
              <dt>Billing</dt><dd>{BILLING_NAMES[a.billing]}</dd>
              <dt>Valid until</dt><dd>{dateText(a.licenseValidUntil)}</dd>
              <dt>Grace period</dt><dd>{a.graceDays} {a.graceDays === 1 ? 'day' : 'days'}</dd>
              <dt>Last payment</dt><dd>{a.lastPaidOn ? dateText(a.lastPaidOn) : 'None recorded'}</dd>
              <dt>Account id</dt><dd className="mono">{a.id}</dd>
            </dl>
          </section>

          <section className="mb-card">
            <div className="card-head"><h2 className="h2">Payments</h2><span className="caption">Recorded by hand when money arrives</span></div>
            {d.payments.length === 0 ? (
              <Empty>No payments recorded yet.</Empty>
            ) : (
              <div className="tbl-scroll">
                <table className="mb-table">
                  <thead><tr><th>Date</th><th className="num">Amount</th><th>Method</th><th>Reference</th><th>Recorded by</th></tr></thead>
                  <tbody>
                    {d.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{dateText(p.paid_on)}</td>
                        <td className="num"><span className="mb-money mb-money--in">{pkr(p.amount_pkr)}</span></td>
                        <td>{PAYMENT_METHODS[p.method] ?? p.method}</td>
                        <td>{p.reference ?? <span className="muted">—</span>}{p.note && <span className="caption">{p.note}</span>}</td>
                        <td>{p.recorded_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="aside">
          <section className="mb-card">
            <h2 className="h2" style={{ marginBottom: 'var(--space-3)' }}>Contact</h2>
            <dl className="kv">
              <dt>Owner</dt><dd>{a.ownerName ?? <span className="muted">Not set</span>}</dd>
              <dt>Mobile</dt>
              <dd>
                {a.phone ? (
                  <span className="row-c" style={{ gap: 'var(--space-2)' }}>
                    <a href={`tel:${a.phone.replace(/\s/g, '')}`}>{phoneText(a.phone)}</a>
                    <a href={`https://wa.me/${whatsappDigits(a.phone)}`} target="_blank" rel="noopener noreferrer" className="caption">WhatsApp</a>
                  </span>
                ) : <span className="muted">Not set</span>}
              </dd>
              <dt>Email</dt><dd>{a.email ? <a href={`mailto:${a.email}`}>{a.email}</a> : <span className="muted">Not set</span>}</dd>
              <dt>City</dt><dd>{a.city ?? <span className="muted">Not set</span>}</dd>
            </dl>
            {a.notes && <><h3 className="h3" style={{ margin: 'var(--space-4) 0 var(--space-1)' }}>Notes</h3><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.notes}</p></>}
          </section>

          <section className="mb-card">
            <div className="card-head"><h2 className="h2">Computers</h2><span className="caption">{a.deviceCount} connected</span></div>
            {d.openCodes > 0 && <p className="sub" style={{ marginBottom: 'var(--space-2)' }}>{d.openCodes} activation {d.openCodes === 1 ? 'code is' : 'codes are'} waiting to be used.</p>}
            {d.devices.filter((x) => !x.revoked_at).length === 0 ? (
              <Empty>No computer is connected. Issue an activation code and give it to the owner.</Empty>
            ) : (
              <div className="list">
                {d.devices.filter((x) => !x.revoked_at).map((dev) => (
                  <DeviceRow key={dev.id} name={dev.name} seen={dev.last_seen_at} since={dev.created_at} onRemove={async () => {
                    await api.removeDevice(dev.id);
                    saved(await api.account(a.id), `Removed ${dev.name}`);
                  }} />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {dlg === 'edit' && <EditDialog d={d} onClose={() => setDlg(null)} onSaved={(n) => saved(n, 'Details saved')} />}
      {dlg === 'payment' && <PaymentDialog d={d} onClose={() => setDlg(null)} onSaved={(n) => saved(n, 'Payment recorded')} />}
      {dlg === 'code' && <CodeDialog d={d} onClose={() => { setDlg(null); state.reload(); }} />}
      {dlg === 'suspend' && <SuspendDialog d={d} onClose={() => setDlg(null)} onSaved={(n) => saved(n, 'Account suspended')} />}
    </Page>
  );

  async function reactivate() {
    try {
      saved(await api.updateAccount(a.id, { status: 'active' }), 'Account reactivated');
    } catch (e) {
      setFlash(null);
      setProblem(messageOf(e));
    }
  }
}

function DeviceRow({ name, seen, since, onRemove }: { name: string; seen: number | null; since: number; onRemove: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const save = useSave();
  return (
    <div className="li">
      <div className="li__main">
        <div className="li__title">{name}</div>
        <div className="caption">Last seen {ago(seen)} · connected {dayTime(since)}</div>
        {save.error && <div className="mb-error">{save.error}</div>}
      </div>
      {confirm ? (
        <span className="row-c">
          <button type="button" className="mb-btn mb-btn--danger" disabled={save.busy} onClick={() => void save.run(onRemove)}>Remove</button>
          <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setConfirm(false)}>Keep</button>
        </span>
      ) : (
        <button type="button" className="icon-btn icon-btn--danger" aria-label={`Remove ${name}`} onClick={() => setConfirm(true)}><Icon name="trash" /></button>
      )}
    </div>
  );
}

function EditDialog({ d, onClose, onSaved }: { d: Detail; onClose: () => void; onSaved: (d: Detail) => void }) {
  const a = d.dealer;
  const plans = useLoad(api.plans, []);
  const save = useSave();
  const [f, setF] = useState({
    name: a.name, ownerName: a.ownerName ?? '', phone: a.phone ?? '', email: a.email ?? '', city: a.city ?? '', notes: a.notes ?? '',
    plan: a.plan, billing: a.billing, until: a.licenseValidUntil, grace: String(a.graceDays),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    const input: AccountInput = {
      name: f.name, ownerName: f.ownerName || null, phone: f.phone || null, email: f.email || null, city: f.city || null, notes: f.notes || null,
      plan: f.plan, billing: f.billing, licenseValidUntil: f.until, graceDays: Number(f.grace),
    };
    void save.run(async () => onSaved(await api.updateAccount(a.id, input)));
  }

  return (
    <Dialog title="Edit details" onClose={onClose} wide>
      <form className="col" onSubmit={submit}>
        <div className="form-row">
          <Field label="Shop name">{(id) => <input id={id} className="mb-input" value={f.name} onChange={set('name')} maxLength={120} required />}</Field>
          <Field label="Owner name">{(id) => <input id={id} className="mb-input" value={f.ownerName} onChange={set('ownerName')} />}</Field>
          <Field label="Mobile">{(id) => <input id={id} className="mb-input" type="tel" value={f.phone} onChange={set('phone')} />}</Field>
          <Field label="Email">{(id) => <input id={id} className="mb-input" type="email" value={f.email} onChange={set('email')} />}</Field>
          <Field label="City">{(id) => <input id={id} className="mb-input" value={f.city} onChange={set('city')} />}</Field>
        </div>
        <div className="form-row">
          <Field label="Plan">
            {(id) => (
              <select id={id} className="sel" value={f.plan} onChange={set('plan')}>
                {(plans.data?.plans ?? [{ id: f.plan, name: planName(f.plan) }]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          <Field label="Valid until">{(id) => <input id={id} className="mb-input" type="date" value={f.until} onChange={set('until')} required />}</Field>
          <Field label="Grace days" hint="0 to 60. The app keeps working, with a warning, after the end date.">
            {(id, desc) => <input id={id} aria-describedby={desc} className="mb-input" type="number" min={0} max={60} step={1} value={f.grace} onChange={set('grace')} required />}
          </Field>
        </div>
        <Field label="Notes (only your team sees these)">{(id) => <textarea id={id} className="mb-input" value={f.notes} onChange={set('notes')} maxLength={2000} />}</Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function PaymentDialog({ d, onClose, onSaved }: { d: Detail; onClose: () => void; onSaved: (d: Detail) => void }) {
  const a = d.dealer;
  const save = useSave();
  const today = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
  const [f, setF] = useState({ amount: '', method: 'cash', paidOn: today, reference: '', note: '', extend: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  // Renewing from the later of today and the current end date, so paying early never loses days.
  const base = a.licenseValidUntil > today ? a.licenseValidUntil : today;

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () =>
      onSaved(await api.recordPayment(a.id, { amountPkr: Number(f.amount), method: f.method, paidOn: f.paidOn, reference: f.reference || undefined, note: f.note || undefined, extendLicenseTo: f.extend || undefined })),
    );
  }

  return (
    <Dialog title="Record a payment" onClose={onClose}>
      <form className="col" onSubmit={submit}>
        <div className="form-row">
          <Field label="Amount (PKR)">{(id) => <input id={id} className="mb-input num" type="number" min={1} step={1} inputMode="numeric" value={f.amount} onChange={set('amount')} required />}</Field>
          <Field label="Paid on">{(id) => <input id={id} className="mb-input" type="date" value={f.paidOn} onChange={set('paidOn')} required />}</Field>
        </div>
        <div className="form-row">
          <Field label="Method">
            {(id) => <select id={id} className="sel" value={f.method} onChange={set('method')}>{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
          </Field>
          <Field label="Reference (optional)" hint="Transaction or receipt number.">{(id, desc) => <input id={id} aria-describedby={desc} className="mb-input" value={f.reference} onChange={set('reference')} maxLength={80} />}</Field>
        </div>
        <Field label="Extend the licence to (optional)" hint={`Now valid until ${dateText(a.licenseValidUntil)}. Leave empty to only record the money.`}>
          {(id, desc) => (
            <div className="col" style={{ gap: 'var(--space-2)' }}>
              <input id={id} aria-describedby={desc} className="mb-input" type="date" value={f.extend} onChange={set('extend')} />
              <div className="row-c">
                <button type="button" className="chip" onClick={() => setF({ ...f, extend: addMonths(base, 1) })}>+1 month</button>
                <button type="button" className="chip" onClick={() => setF({ ...f, extend: addMonths(base, 3) })}>+3 months</button>
                <button type="button" className="chip" onClick={() => setF({ ...f, extend: addMonths(base, 12) })}>+1 year</button>
              </div>
            </div>
          )}
        </Field>
        <Field label="Note (optional)">{(id) => <input id={id} className="mb-input" value={f.note} onChange={set('note')} maxLength={300} />}</Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : f.extend ? 'Record and extend' : 'Record payment'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function CodeDialog({ d, onClose }: { d: Detail; onClose: () => void }) {
  const a = d.dealer;
  const save = useSave();
  const { copied, copy } = useCopy();
  const [days, setDays] = useState('7');
  const [issued, setIssued] = useState<{ code: string; expiresAt: number } | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => setIssued(await api.issueCode(a.id, Number(days))));
  }

  const message = issued ? `Your Maalbaan activation code is ${issued.code}. Open Settings, then Licence, type the code and press Connect this computer. It works once, until ${dateText(new Date(issued.expiresAt).toISOString())}.` : '';

  return (
    <Dialog title={`Activation code for ${a.name}`} onClose={onClose}>
      {issued ? (
        <>
          <Alert tone="warning" title="Copy it now">The code is shown only once and cannot be read back later.</Alert>
          <div className="keyout" aria-label="Activation code">{issued.code}</div>
          <p className="sub">Works once, until {dateText(new Date(issued.expiresAt).toISOString())}.</p>
          <div className="dialog-foot">
            <button type="button" className="mb-btn mb-btn--secondary" onClick={() => void copy(issued.code)}><Icon name="copy" />{copied ? 'Copied' : 'Copy code'}</button>
            {a.phone && <a className="mb-btn mb-btn--secondary" href={`https://wa.me/${whatsappDigits(a.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
            <button type="button" className="mb-btn mb-btn--primary" onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <form className="col" onSubmit={submit}>
          <p className="sub">The owner types this code in Settings, Licence, on the shop computer. It connects that computer to this account.</p>
          <Field label="Valid for (days)" hint="1 to 60. The code works only once.">
            {(id, desc) => <input id={id} aria-describedby={desc} className="mb-input" type="number" min={1} max={60} step={1} value={days} onChange={(e) => setDays(e.target.value)} required />}
          </Field>
          {save.error && <Alert tone="danger">{save.error}</Alert>}
          <div className="dialog-foot">
            <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Making…' : 'Generate code'}</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function SuspendDialog({ d, onClose, onSaved }: { d: Detail; onClose: () => void; onSaved: (d: Detail) => void }) {
  const save = useSave();
  const [reason, setReason] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => onSaved(await api.updateAccount(d.dealer.id, { status: 'suspended', suspendedReason: reason || null })));
  }
  return (
    <Dialog title={`Suspend ${d.dealer.name}?`} onClose={onClose}>
      <form className="col" onSubmit={submit}>
        <p className="sub">The app locks on every computer of this shop the next time it checks in, with no grace days. Nothing is deleted. Reactivate it at any time.</p>
        <Field label="Reason (only your team sees this)">{(id) => <input id={id} className="mb-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="For example: unpaid since September" />}</Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--danger" disabled={save.busy}>{save.busy ? 'Suspending…' : 'Suspend account'}</button>
        </div>
      </form>
    </Dialog>
  );
}
