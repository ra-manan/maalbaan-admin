import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { initials } from './format';
import { Dialog, Field, Icon, useSave, Alert, type IconName } from './ui';

const NAV: { to: string; label: string; icon: IconName; ownerOnly?: boolean; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/accounts', label: 'Accounts', icon: 'accounts' },
  { to: '/demo-requests', label: 'Demo requests', icon: 'demo' },
  { to: '/plans', label: 'Plans and prices', icon: 'plans' },
  { to: '/staff', label: 'Staff', icon: 'staff', ownerOnly: true },
  { to: '/activity', label: 'Activity log', icon: 'activity' },
];

export function Shell() {
  const { admin } = useAuth();
  return (
    <div className="mb-theme app" lang="en">
      <nav className="side" aria-label="Admin menu">
        <div className="side-brand">
          <img src="/favicon.svg" alt="" width="34" height="43" />
          <div>
            <div className="side-dealer">Maalbaan Admin</div>
            <div className="caption">manage.maalbaan.com</div>
          </div>
        </div>
        {NAV.filter((n) => !n.ownerOnly || admin.role === 'owner').map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
            <Icon name={n.icon} />
            <span className="nav-label">{n.label}</span>
          </NavLink>
        ))}
        <div className="side-foot">
          <div className="sync-card">
            <div className="label">Privacy guard</div>
            <div className="caption">This panel shows licences and usage only. Dealers’ invoices and customers never reach it.</div>
          </div>
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

/** Every screen: the top bar (title, search, who is signed in) and the page body. */
export function Page({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [password, setPassword] = useState(false);

  function search(e: FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/accounts?q=${encodeURIComponent(q.trim())}` : '/accounts');
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          <h1 className="h1">{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        <form className="search" role="search" onSubmit={search}>
          <Icon name="search" />
          <input className="mb-input" type="search" aria-label="Find an account" placeholder="Find an account" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="user">
          <span className="avatar" aria-hidden="true">{initials(admin.name)}</span>
          <span className="user-text">
            <span className="label">{admin.name}</span>
            <span className="caption">{admin.role === 'owner' ? 'Owner' : 'Staff'}</span>
          </span>
          <button type="button" className="link-btn" onClick={() => setPassword(true)}>Password</button>
          <button type="button" className="link-btn" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>
      <div className="page">
        {actions && <div className="row-c actions">{actions}</div>}
        {children}
      </div>
      {password && <PasswordDialog onClose={() => setPassword(false)} />}
    </>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => {
      await api.changePassword(current, next);
      setDone(true);
    });
  }

  return (
    <Dialog title="Change your password" onClose={onClose}>
      {done ? (
        <>
          <Alert tone="success" title="Password changed">Your other sign-ins were ended.</Alert>
          <div className="dialog-foot"><button type="button" className="mb-btn mb-btn--primary" onClick={onClose}>Done</button></div>
        </>
      ) : (
        <form className="col" onSubmit={submit}>
          <Field label="Current password">{(id) => <input id={id} className="mb-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}</Field>
          <Field label="New password" hint="At least 10 characters.">
            {(id, d) => <input id={id} aria-describedby={d} className="mb-input" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required />}
          </Field>
          {save.error && <Alert tone="danger">{save.error}</Alert>}
          <div className="dialog-foot">
            <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
