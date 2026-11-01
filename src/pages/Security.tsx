import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Page } from '../Shell';
import { Alert, Badge, Field, useSave } from '../ui';

/**
 * Sign-in security for this person: the authenticator app (a second step after the password). Where the panel requires it,
 * a sign-in without one lands here and can do nothing else until it is set up.
 */
export function Security({ required = false }: { required?: boolean }) {
  const { admin } = useAuth();
  const [secret, setSecret] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [off, setOff] = useState(false);
  const start = useSave();
  const confirm = useSave();
  const disable = useSave();

  // The authenticator state is part of who is signed in, so after a change the page starts again and asks the server.
  const done = () => window.location.assign('/security');

  function confirmCode(e: FormEvent) {
    e.preventDefault();
    void confirm.run(async () => {
      await api.totpConfirm(code);
      done();
    });
  }

  function turnOff(e: FormEvent) {
    e.preventDefault();
    void disable.run(async () => {
      await api.totpDisable(password, code);
      done();
    });
  }

  return (
    <Page title="Security" sub="How you sign in">
      {required && (
        <Alert tone="warning" title="Set up your authenticator app to continue">
          This panel asks for a code from an authenticator app each time you sign in. Nothing else opens until it is set up.
        </Alert>
      )}
      <section className="mb-card">
        <div className="row-c">
          <h2 className="h2">Authenticator app</h2>
          <Badge tone={admin.totp ? 'success' : 'warning'}>{admin.totp ? 'On' : 'Not set up'}</Badge>
        </div>
        <p className="sub">After your password, you type the 6 digits an authenticator app shows (Google Authenticator, Microsoft Authenticator, Authy and others). A stolen or guessed password alone cannot open this panel.</p>

        {!admin.totp && !secret && (
          <div>
            <button type="button" className="mb-btn mb-btn--primary" disabled={start.busy} onClick={() => void start.run(async () => setSecret(await api.totpStart()))}>
              {start.busy ? 'Starting…' : 'Set up an authenticator app'}
            </button>
            {start.error && <Alert tone="danger">{start.error}</Alert>}
          </div>
        )}

        {!admin.totp && secret && (
          <form className="col" onSubmit={confirmCode}>
            <ol>
              <li>In your authenticator app, add a new account and choose to enter a key by hand.</li>
              <li>
                Type this key (the spaces do not matter): <strong className="latin" dir="ltr" style={{ letterSpacing: '0.08em' }}>{secret.secret.match(/.{1,4}/g)?.join(' ')}</strong>
              </li>
              <li>On a phone with the app installed you can also <a href={secret.uri}>open this link</a>.</li>
              <li>Type the 6 digits the app now shows.</li>
            </ol>
            <Field label="6 digits from the app">
              {(id) => <input id={id} className="mb-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required />}
            </Field>
            {confirm.error && <Alert tone="danger">{confirm.error}</Alert>}
            <div>
              <button type="submit" className="mb-btn mb-btn--primary" disabled={confirm.busy}>{confirm.busy ? 'Checking…' : 'Turn it on'}</button>
            </div>
            <p className="caption">Keep the key somewhere safe. If you lose your phone, an owner can clear the app from the Staff page so you can set up a new one.</p>
          </form>
        )}

        {admin.totp && !off && !required && (
          <div>
            <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setOff(true)}>Turn off the authenticator app</button>
          </div>
        )}

        {admin.totp && off && (
          <form className="col" onSubmit={turnOff}>
            <Field label="Your password">{(id) => <input id={id} className="mb-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
            <Field label="Current 6 digits from the app">
              {(id) => <input id={id} className="mb-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required />}
            </Field>
            {disable.error && <Alert tone="danger">{disable.error}</Alert>}
            <div className="row-c">
              <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setOff(false)}>Cancel</button>
              <button type="submit" className="mb-btn mb-btn--danger" disabled={disable.busy}>{disable.busy ? 'Turning off…' : 'Turn off'}</button>
            </div>
          </form>
        )}
      </section>
    </Page>
  );
}
