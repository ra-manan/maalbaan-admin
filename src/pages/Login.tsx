import { useState, type FormEvent } from 'react';
import { api, ApiError, type Admin } from '../api';
import { EnvironmentSwitch } from '../EnvironmentSwitch';
import { Alert, Field, useSave } from '../ui';

export function Login({ onSignedIn, notice }: { onSignedIn: (a: Admin) => void; notice?: string }) {
  const save = useSave();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // The server asks for the authenticator code after it has seen the right password.
  const [needCode, setNeedCode] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    void save.run(async () => {
      try {
        onSignedIn((await api.login(email, password, needCode ? code : undefined)).admin);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'totp_required') {
          setNeedCode(true);
          return;
        }
        throw err;
      }
    });
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
        <EnvironmentSwitch />
        {notice && <Alert tone="warning">{notice}</Alert>}
        <Field label="Email">{(id) => <input id={id} className="mb-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
        <Field label="Password">{(id) => <input id={id} className="mb-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
        {needCode && (
          <Field label="Code from your authenticator app" hint="The 6 digits shown in the app. They change every 30 seconds.">
            {(id, d) => <input id={id} aria-describedby={d} className="mb-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />}
          </Field>
        )}
        {save.error && <Alert tone="danger">{save.error}</Alert>}
        <button type="submit" className="mb-btn mb-btn--primary mb-btn--lg" disabled={save.busy}>{save.busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="caption">Forgot your password, or lost your phone? Ask the owner to reset it.</p>
      </form>
    </div>
  );
}
