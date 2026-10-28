import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ApiError } from './api';
import type { Tone } from './format';

// ---------- icons (outlined, 1.75 stroke, from the design kit) ----------

const PATHS = {
  dashboard: 'M4 13h6V4H4zM14 20h6V11h-6zM14 8h6V4h-6zM4 20h6v-3H4z',
  accounts: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  demo: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  plans: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  staff: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  activity: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  key: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 11v5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  out: 'M10 17l5-5-5-5M15 12H3M21 4v16',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  back: 'M15 5l-7 7 7 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---------- small pieces ----------

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`mb-badge${tone === 'neutral' ? '' : ` mb-badge--${tone}`}`}>{children}</span>;
}

export function Alert({ tone, title, children, action }: { tone: 'success' | 'warning' | 'danger'; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`mb-alert mb-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'check' : 'alert'} className="mb-alert__icon" />
      <div className="grow">
        {title && <div className="mb-alert__title">{title}</div>}
        {children && <div className="mb-alert__text">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Kpi({ label, value, meta, tone }: { label: string; value: ReactNode; meta?: ReactNode; tone?: 'danger' | 'success' }) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className={`kpi__value${tone ? ` mb-money--${tone === 'danger' ? 'out' : 'in'}` : ''}`}>{value}</span>
      {meta !== undefined && <span className="kpi__meta">{meta}</span>}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: (id: string, describedBy: string | undefined) => ReactNode }) {
  const id = useId();
  const noteId = hint || error ? `${id}-note` : undefined;
  return (
    <div className={`mb-field${error ? ' is-error' : ''}`}>
      <label className="mb-label" htmlFor={id}>
        {label}
      </label>
      {children(id, noteId)}
      {error ? (
        <span className="mb-error" id={noteId}>
          {error}
        </span>
      ) : hint ? (
        <span className="mb-hint" id={noteId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-dash">{children}</div>;
}

// ---------- dialog ----------

/** A modal box: Esc closes it, focus goes in on open and back to the button on close, Tab stays inside. */
export function Dialog({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea') ?? box.current?.querySelector<HTMLElement>('button');
    first?.focus();
    return () => before?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
    if (items.length === 0) return;
    const [first, last] = [items[0]!, items[items.length - 1]!];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className={`dialog${wide ? ' dialog--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <h2 className="h2" id={titleId}>
          {title}
        </h2>
        {children}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- loading data ----------

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/** Runs `load` on mount and when `deps` change. A late answer from an older call is dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const run = ++latest.current;
    setLoading(true);
    load()
      .then((d) => {
        if (run !== latest.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (run === latest.current) setError(messageOf(e));
      })
      .finally(() => {
        if (run === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function messageOf(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
}

/** Shows what a page needs while it has no data yet. */
export function LoadState({ state, children }: { state: Pick<Loaded<unknown>, 'data' | 'error' | 'reload'>; children: ReactNode }) {
  if (state.data) return <>{children}</>;
  if (state.error) {
    return (
      <Alert tone="danger" title="Could not load this page" action={<button type="button" className="mb-btn mb-btn--secondary" onClick={state.reload}>Try again</button>}>
        {state.error}
      </Alert>
    );
  }
  return <p className="sub" role="status">Loading…</p>;
}

/** Runs a save, keeps the dialog open and shows the server's sentence if it fails. */
export function useSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, clear: () => setError(null) };
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return { copied, copy };
}
