import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setSignedOutHandler, type Admin } from './api';

interface AuthValue {
  admin: Admin;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside the signed-in area');
  return v;
}

type State = { phase: 'loading' } | { phase: 'out'; notice?: string } | { phase: 'in'; admin: Admin };

/** Asks the server who is signed in. Shows `signedOut` when nobody is, and `children` when someone is. */
export function AuthGate({ signedOut, children }: { signedOut: (onSignedIn: (a: Admin) => void, notice?: string) => ReactNode; children: ReactNode }) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    // Only someone who was signed in is told they were signed out; a fresh visit just shows the form.
    setSignedOutHandler(() => setState((s) => (s.phase === 'in' ? { phase: 'out', notice: 'You were signed out. Please sign in again.' } : { phase: 'out' })));
    api
      .me()
      .then((r) => setState({ phase: 'in', admin: r.admin }))
      .catch(() => setState((s) => (s.phase === 'loading' ? { phase: 'out' } : s)));
  }, []);

  if (state.phase === 'loading') return <p className="sub" style={{ padding: 24 }} role="status">Loading…</p>;
  if (state.phase === 'out') return <>{signedOut((admin) => setState({ phase: 'in', admin }), state.notice)}</>;

  const signOut = async () => {
    await api.logout().catch(() => {});
    setState({ phase: 'out' });
  };
  return <Ctx.Provider value={{ admin: state.admin, signOut }}>{children}</Ctx.Provider>;
}
