import { useState, type FormEvent } from 'react';
import { api, type Staff as Person } from '../api';
import { useAuth } from '../auth';
import { ago, dayTime } from '../format';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Field, Icon, LoadState, messageOf, useLoad, useSave } from '../ui';

export function Staff() {
  const { admin } = useAuth();
  const state = useLoad(api.staff, []);
  const [adding, setAdding] = useState(false);
  const [reset, setReset] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(p: Person) {
    setError(null);
    try {
      await api.updateStaff(p.id, { active: !p.active });
      state.reload();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <Page title="Staff" sub="People who can sign in to this panel" actions={<button type="button" className="mb-btn mb-btn--primary" onClick={() => setAdding(true)}><Icon name="plus" />Add person</button>}>
      {error && <Alert tone="danger">{error}</Alert>}
      <LoadState state={state}>
        <div className="mb-table-wrap tbl-scroll">
          <table className="mb-table">
            <thead><tr><th>Person</th><th>Role</th><th>Last sign-in</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {state.data?.staff.map((p) => (
                <tr key={p.id}>
                  <td><span className="cell-name">{p.name}{p.id === admin.id ? ' (you)' : ''}</span><span className="caption">{p.email}</span></td>
                  <td>{p.role === 'owner' ? 'Owner' : 'Staff'}</td>
                  <td>{p.last_login_at ? <>{ago(p.last_login_at)}<span className="caption">{dayTime(p.last_login_at)}</span></> : <span className="muted">Never</span>}</td>
                  <td><Badge tone={p.active ? 'success' : 'danger'}>{p.active ? 'Can sign in' : 'Paused'}</Badge></td>
                  <td>
                    <span className="row-c">
                      <button type="button" className="link-btn" onClick={() => setReset(p)}>Set new password<span className="visually-hidden"> for {p.name}</span></button>
                      {p.id !== admin.id && <button type="button" className="link-btn" onClick={() => void toggle(p)}>{p.active ? 'Pause' : 'Allow'}<span className="visually-hidden"> {p.name}</span></button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption">Staff can work with accounts, payments and demo requests. Only an owner can change prices and manage this list. Pausing a person signs them out at once.</p>
      </LoadState>
      {adding && <AddDialog onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
      {reset && <ResetDialog p={reset} onClose={() => setReset(null)} />}
    </Page>
  );
}

function AddDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const save = useSave();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => {
      await api.createStaff(f);
      onDone();
    });
  }
  return (
    <Dialog title="Add a person" onClose={onClose}>
      <form className="col" onSubmit={submit}>
        <Field label="Name">{(id) => <input id={id} className="mb-input" value={f.name} onChange={set('name')} required maxLength={80} />}</Field>
        <Field label="Email">{(id) => <input id={id} className="mb-input" type="email" autoComplete="off" value={f.email} onChange={set('email')} required />}</Field>
        <Field label="First password" hint="At least 10 characters. Tell them in person or on a call, and ask them to change it.">
          {(id, d) => <input id={id} aria-describedby={d} className="mb-input" type="text" autoComplete="off" minLength={10} value={f.password} onChange={set('password')} required />}
        </Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Adding…' : 'Add person'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetDialog({ p, onClose }: { p: Person; onClose: () => void }) {
  const save = useSave();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => {
      await api.updateStaff(p.id, { password });
      setDone(true);
    });
  }
  return (
    <Dialog title={`New password for ${p.name}`} onClose={onClose}>
      {done ? (
        <>
          <Alert tone="success" title="Password set">{p.name} was signed out everywhere and can sign in with the new password.</Alert>
          <div className="dialog-foot"><button type="button" className="mb-btn mb-btn--primary" onClick={onClose}>Done</button></div>
        </>
      ) : (
        <form className="col" onSubmit={submit}>
          <Field label="New password" hint="At least 10 characters.">{(id, d) => <input id={id} aria-describedby={d} className="mb-input" type="text" autoComplete="off" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
          {save.error && <Alert tone="danger">{save.error}</Alert>}
          <div className="dialog-foot">
            <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Set password'}</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
