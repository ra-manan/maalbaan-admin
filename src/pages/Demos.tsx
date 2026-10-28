import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type DemoRequest, type DemoStatus } from '../api';
import { ago, dayTime, DEMO_STATUS, phoneText, whatsappDigits } from '../format';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Empty, Field, LoadState, messageOf, useLoad, useSave } from '../ui';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'scheduled', label: 'Demo booked' },
  { key: 'converted', label: 'Account created' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'spam', label: 'Spam' },
];

/** What a person may set by hand. "Account created" only happens through the button, so the link to the account always exists. */
const SETTABLE: DemoStatus[] = ['new', 'contacted', 'scheduled', 'not_interested', 'spam'];

export function Demos() {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<DemoRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useLoad(() => api.demos(filter), [filter]);
  const rows = state.data?.requests ?? [];
  const counts = state.data?.counts;

  async function setStatus(r: DemoRequest, status: DemoStatus) {
    setError(null);
    try {
      await api.updateDemo(r.id, { status });
      state.reload();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <Page title="Demo requests" sub="People who filled in “Book a free demo” on maalbaan.com">
      <div className="row-c" role="group" aria-label="Filter demo requests">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`chip${filter === f.key ? ' is-on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} {counts && <span className="count">{f.key ? counts[f.key] ?? 0 : counts.all}</span>}
          </button>
        ))}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <LoadState state={state}>
        {rows.length === 0 ? (
          <Empty>{filter ? 'No request with this status.' : 'No demo requests yet. They appear here as soon as someone sends the form on maalbaan.com.'}</Empty>
        ) : (
          <div className="mb-table-wrap tbl-scroll">
            <table className="mb-table">
              <thead>
                <tr><th>Received</th><th>Name</th><th>Mobile</th><th>City</th><th>Status</th><th><span className="visually-hidden">Action</span></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{ago(r.createdAt)}<span className="caption">{dayTime(r.createdAt)}</span></td>
                    <td><span className="cell-name">{r.name}</span><span className="caption">{r.shop ?? 'No shop name'}</span></td>
                    <td>
                      <a href={`tel:${r.phone}`}>{phoneText(r.phone)}</a>
                      <a className="caption" href={`https://wa.me/${whatsappDigits(r.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    </td>
                    <td>{r.city ?? <span className="muted">—</span>}</td>
                    <td>
                      {r.status === 'converted' ? (
                        <Badge tone="success">Account created</Badge>
                      ) : (
                        <select className="sel inline-sel" aria-label={`Status for ${r.name}`} value={r.status} onChange={(e) => void setStatus(r, e.target.value as DemoStatus)}>
                          {SETTABLE.map((s) => <option key={s} value={s}>{DEMO_STATUS[s].label}</option>)}
                        </select>
                      )}
                      {r.notes && <span className="caption">Has notes</span>}
                    </td>
                    <td>
                      {r.status === 'converted' && r.dealerId
                        ? <Link to={`/accounts/${r.dealerId}`} className="link-btn">View account</Link>
                        : <button type="button" className="link-btn" onClick={() => setOpen(r)}>Open<span className="visually-hidden"> {r.name}</span></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadState>
      {open && <RequestDialog r={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); state.reload(); }} />}
    </Page>
  );
}

function RequestDialog({ r, onClose, onChanged }: { r: DemoRequest; onClose: () => void; onChanged: () => void }) {
  const navigate = useNavigate();
  const save = useSave();
  const [notes, setNotes] = useState(r.notes ?? '');

  return (
    <Dialog title={r.name} onClose={onClose}>
      <dl className="kv">
        <dt>Shop</dt><dd>{r.shop ?? <span className="muted">Not given</span>}</dd>
        <dt>Mobile</dt><dd><a href={`tel:${r.phone}`}>{phoneText(r.phone)}</a> · <a href={`https://wa.me/${whatsappDigits(r.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></dd>
        <dt>City</dt><dd>{r.city ?? <span className="muted">Not given</span>}</dd>
        <dt>Received</dt><dd>{dayTime(r.createdAt)}</dd>
      </dl>
      <Field label="Notes (only your team sees these)">{(id) => <textarea id={id} className="mb-input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="For example: called, visit on Friday" />}</Field>
      {save.error && <Alert tone="danger">{save.error}</Alert>}
      <div className="dialog-foot">
        <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Close</button>
        <button type="button" className="mb-btn mb-btn--secondary" disabled={save.busy} onClick={() => void save.run(async () => { await api.updateDemo(r.id, { notes }); onChanged(); })}>Save notes</button>
        <button type="button" className="mb-btn mb-btn--primary" disabled={save.busy} onClick={() => void save.run(async () => {
          if (notes !== (r.notes ?? '')) await api.updateDemo(r.id, { notes });
          const made = await api.convertDemo(r.id);
          navigate(`/accounts/${made.dealerId}`);
        })}>Create trial account</button>
      </div>
      <p className="caption">A trial account lasts 14 days. You can change the plan and dates on the next page.</p>
    </Dialog>
  );
}
