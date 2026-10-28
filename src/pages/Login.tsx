import { useState, type FormEvent } from 'react';
import { api, type Admin } from '../api';
import { Alert, Field, useSave } from '../ui';

export function Login({ onSignedIn, notice }: { onSignedIn: (a: Admin) => void; notice?: string }) {
  const save = useSave();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => onSignedIn((await api.login(email, password)).admin));
  }

  return (
    <div className="mb-theme login">
      <form className="mb-card mb-card--raised login-card" onSubmit={submit}>
        <div className="side-brand">
          <img src="/favicon.svg" alt="" width="34" height="43" />
          <div>
            <h1 className="h2">Maalbaan Admin</h1>
            <p className="caption">Sign in to manage accounts</p>
          </div>
        </div>
        {notice && <Alert tone="warning">{notice}</Alert>}
        <Field label="Email">{(id) => <input id={id} className="mb-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
        <Field label="Password">{(id) => <input id={id} className="mb-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <button type="submit" className="mb-btn mb-btn--primary mb-btn--lg" disabled={save.busy}>{save.busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="caption">Forgot your password? Ask the owner to reset it.</p>
      </form>
    </div>
  );
}
