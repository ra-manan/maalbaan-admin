import { useEffect, useState } from 'react';
import { api, type EvalRun, type MunshiEvent, type MunshiGroup, type MunshiShop, type MunshiSummary, type MunshiView } from '../api';
import { ago, dayTime, millis, percent, ratio, usd, type Tone } from '../format';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Empty, Kpi, LoadState, messageOf, useLoad, useSave } from '../ui';

type Tab = 'overview' | 'accuracy' | 'failures' | 'shops';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'failures', label: 'Failures and edits' },
  { key: 'shops', label: 'Shops' },
];

const DAYS = [7, 30, 90];

/** Plain words for the reasons the server logs. */
const FAILURE: Record<string, string> = {
  model_off: 'Claude is not switched on',
  model_failed: 'Claude could not be reached',
  bad_json: 'Claude’s answer could not be read',
  bad_request: 'The request was incomplete',
  rate_limited: 'Too many requests at once',
  speech_off: 'Listening is not switched on',
  speech_failed: 'The clip could not be written down',
};
const failureText = (f: string | null) => (f ? FAILURE[f] ?? f : 'Unknown');

const LANGUAGE: Record<string, string> = { ur: 'Urdu', en: 'English', unknown: 'Not said' };
const SURFACE: Record<string, string> = { desktop: 'Windows app', web: 'Web', phone: 'Phone', unknown: 'Not said' };
const ROLE: Record<string, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier', accountant: 'Accountant', salesman: 'Salesman', unknown: 'Not said' };

export function Munshi() {
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(7);

  return (
    <Page title="Munshi" sub="How voice entry is doing: what worked, what failed and what it costs">
      <div className="toolbar">
        <div className="row-c" role="group" aria-label="Section">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`chip${tab === t.key ? ' is-on' : ''}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'failures' && (
          <div className="row-c" role="group" aria-label="Period">
            {DAYS.map((d) => (
              <button key={d} type="button" className={`chip${days === d ? ' is-on' : ''}`} aria-pressed={days === d} onClick={() => setDays(d)}>
                Last {d} days
              </button>
            ))}
          </div>
        )}
      </div>
      {tab === 'overview' && <Overview days={days} />}
      {tab === 'accuracy' && <Accuracy days={days} />}
      {tab === 'failures' && <Failures />}
      {tab === 'shops' && <Shops days={days} />}
    </Page>
  );
}

// ---------- overview ----------

function Overview({ days }: { days: number }) {
  const state = useLoad(() => api.munshiSummary(days), [days]);
  return <LoadState state={state}>{state.data && <OverviewBody s={state.data} />}</LoadState>;
}

function OverviewBody({ s }: { s: MunshiSummary }) {
  if (s.commands === 0 && s.speech.clips === 0) {
    return <Empty>Nothing yet in the last {s.days} days. Voice entries show up here as soon as someone speaks an invoice on a connected computer or phone.</Empty>;
  }
  const worked = s.commands > 0 ? Math.round(((s.commands - s.failed) / s.commands) * 1000) / 10 : null;
  const maxDay = Math.max(...s.byDay.map((d) => d.commands), 1);
  const failures = Object.entries(s.failures).sort((a, b) => b[1] - a[1]);
  const settledLines = s.lines.kept + s.lines.changed + s.lines.removed;

  return (
    <>
      {s.truncated && <Alert tone="warning" title="Showing the newest part only">This period has more entries than the page can add up. Choose a shorter period for exact figures.</Alert>}
      <div className="kpis">
        <Kpi label="Voice entries" value={s.commands} meta={`${s.speech.clips} speech clips`} />
        <Kpi label="Read without a failure" value={percent(worked)} tone={worked !== null && worked < 90 ? 'danger' : undefined} meta={`${s.failed} failed`} />
        <Kpi label="Kept as spoken" value={percent(s.lines.keptPct)} meta={settledLines > 0 ? `${s.lines.kept} of ${settledLines} lines unchanged at save` : 'No invoice saved yet'} />
        <Kpi label="Undone" value={s.undone} meta="Person took the last speech off" />
      </div>
      <div className="kpis">
        <Kpi label="Cost" value={usd(s.costMicro)} meta={`${usd(s.costPerCommandMicro)} per entry · Claude and speech`} />
        <Kpi label="Speed" value={millis(s.latencyMs.p50)} meta={`Slowest 1 in 20: ${millis(s.latencyMs.p95)}`} />
        <Kpi label="Read by Claude" value={s.answeredByAi} meta="Through the server" />
        <Kpi label="Read on the device" value={s.answeredByLocal} meta="Offline, or Claude could not be reached" />
      </div>

      <div className="grid-2">
        <section className="mb-card">
          <div className="card-head">
            <div>
              <h2 className="h2">Entries per day</h2>
              <p className="sub">Pakistan time. The dark part of a bar is the failed ones.</p>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="bars" role="img" aria-label={`Voice entries per day: ${s.byDay.map((d) => `${d.day} ${d.commands}, ${d.failed} failed`).join('; ')}.`}>
              {s.byDay.map((d) => (
                <div className="bar" key={d.day}>
                  <span className="bar__val">{d.commands}</span>
                  <div className="bar__fill" style={{ height: `${(d.commands / maxDay) * 160}px` }} />
                </div>
              ))}
            </div>
            <div className="bar-labels" aria-hidden="true">{s.byDay.map((d) => <span key={d.day}>{d.day.slice(8)}</span>)}</div>
          </div>
        </section>

        <section className="mb-card">
          <div className="card-head"><h2 className="h2">Why things failed</h2></div>
          {failures.length === 0 ? (
            <Empty>No failures in this period.</Empty>
          ) : (
            <div className="list">
              {failures.map(([reason, n]) => (
                <div className="li" key={reason}>
                  <div className="li__main"><div className="li__title">{failureText(reason)}</div></div>
                  <span className="num">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid-2">
        <Breakdown title="By language" rows={s.byLanguage} names={LANGUAGE} />
        <Breakdown title="By screen" rows={s.bySurface} names={SURFACE} />
        <Breakdown title="By role" rows={s.byRole} names={ROLE} />
        <Breakdown title="By model" rows={s.byModel} names={{}} />
      </div>
    </>
  );
}

function Breakdown({ title, rows, names }: { title: string; rows: MunshiGroup[]; names: Record<string, string> }) {
  return (
    <section className="mb-card">
      <div className="card-head"><h2 className="h2">{title}</h2></div>
      {rows.length === 0 ? (
        <Empty>Nothing yet.</Empty>
      ) : (
        <div className="mb-table-wrap tbl-scroll">
          <table className="mb-table">
            <thead><tr><th>{title.replace('By ', '').replace(/^./, (c) => c.toUpperCase())}</th><th className="num">Entries</th><th className="num">Failed</th><th className="num">Kept as spoken</th><th className="num">Cost</th></tr></thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.key}>
                  <td><span className="cell-name">{names[g.key] ?? g.key}</span></td>
                  <td className="num">{g.commands}</td>
                  <td className="num">{g.failed}</td>
                  <td className="num">{percent(g.keptPct)}</td>
                  <td className="num">{usd(g.costMicro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- accuracy ----------

function Accuracy({ days }: { days: number }) {
  const live = useLoad(() => api.munshiSummary(days), [days]);
  const runs = useLoad(api.munshiEvalRuns, []);
  return (
    <>
      <section className="mb-card">
        <div className="card-head">
          <div>
            <h2 className="h2">Live: kept as spoken</h2>
            <p className="sub">Of the lines a speech put on an invoice, how many were still there, unchanged, when the invoice was saved. Real shops, real voices.</p>
          </div>
        </div>
        <LoadState state={live}>
          {live.data && (
            <>
              <div className="kpis">
                <Kpi label="Kept as spoken" value={percent(live.data.lines.keptPct)} meta={`${live.data.lines.kept} lines`} />
                <Kpi label="Changed after" value={live.data.lines.changed} meta="Quantity, rate or discount edited" />
                <Kpi label="Taken off" value={live.data.lines.removed} meta="Line removed before saving" />
                <Kpi label="Undone" value={live.data.undone} meta="Whole speech taken off" />
              </div>
              <div className="grid-2">
                <Breakdown title="By language" rows={live.data.byLanguage} names={LANGUAGE} />
                <Breakdown title="By model" rows={live.data.byModel} names={{}} />
              </div>
              <p className="caption">A wrong action — Munshi did something confidently and it was wrong — can only be measured once Munshi runs commands, not just invoice lines. Until then, “changed after” and “taken off” are the nearest figure.</p>
            </>
          )}
        </LoadState>
      </section>

      <section className="mb-card">
        <div className="card-head">
          <div>
            <h2 className="h2">Test sets</h2>
            <p className="sub">Scores from the eval runner on fixed, hand-checked sentences, so two model versions can be compared fairly.</p>
          </div>
        </div>
        <LoadState state={runs}>
          {runs.data && runs.data.runs.length === 0 ? (
            <Empty>No test run uploaded yet. The eval runner in the Munshi Agent repo sends one here after each run.</Empty>
          ) : (
            runs.data && <EvalTable runs={runs.data.runs} />
          )}
        </LoadState>
      </section>
    </>
  );
}

const SCORES: { key: string; label: string; good: 'high' | 'low' }[] = [
  { key: 'exactMatch', label: 'Exact match', good: 'high' },
  { key: 'wrongAction', label: 'Wrong action', good: 'low' },
  { key: 'abstain', label: 'Asked to check', good: 'low' },
  { key: 'wer', label: 'Word errors', good: 'low' },
];

function EvalTable({ runs }: { runs: EvalRun[] }) {
  return (
    <div className="mb-table-wrap tbl-scroll">
      <table className="mb-table">
        <thead>
          <tr><th>Run</th><th>Set</th>{SCORES.map((c) => <th key={c.key} className="num">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="cell-name">{r.label}</span>
                <span className="caption">{r.kind === 'speech' ? 'Speech' : 'Understanding'}{r.language ? ` · ${LANGUAGE[r.language] ?? r.language}` : ''} · {dayTime(r.createdAt)}</span>
                {r.notes && <span className="caption">{r.notes}</span>}
              </td>
              <td>{r.setName}<span className="caption">{r.setSize} sentences</span></td>
              {SCORES.map((c) => <td key={c.key} className="num">{ratio(r.metrics[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- failures and edits ----------

const VIEWS: { key: MunshiView; label: string }[] = [
  { key: 'failed', label: 'Failed' },
  { key: 'edited', label: 'Edited after' },
  { key: 'cancelled', label: 'Nothing added' },
  { key: 'all', label: 'Everything' },
];

function Failures() {
  const [view, setView] = useState<MunshiView>('failed');
  const first = useLoad(() => api.munshiEvents(view), [view]);
  const [older, setOlder] = useState<MunshiEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOlder([]);
    setDone(false);
    setError(null);
  }, [view]);

  const rows = [...(first.data?.events ?? []), ...older];

  async function showOlder() {
    const last = rows.at(-1);
    if (!last) return;
    setError(null);
    try {
      const { events } = await api.munshiEvents(view, last.created_at);
      setOlder((o) => [...o, ...events]);
      if (events.length < 50) setDone(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <>
      <div className="row-c" role="group" aria-label="Which entries">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" className={`chip${view === v.key ? ' is-on' : ''}`} aria-pressed={view === v.key} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>
      <LoadState state={first}>
        {rows.length === 0 ? (
          <Empty>{view === 'failed' ? 'No failures. Nothing to fix here.' : 'Nothing in this list yet.'}</Empty>
        ) : (
          <>
            <div className="mb-table-wrap tbl-scroll">
              <table className="mb-table">
                <thead><tr><th>When</th><th>Shop</th><th>What was said</th><th>What happened</th></tr></thead>
                <tbody>
                  {rows.map((e) => {
                    const r = result(e);
                    return (
                      <tr key={e.id}>
                        <td>{ago(e.created_at)}<span className="caption">{dayTime(e.created_at)}</span></td>
                        <td>
                          <span className="cell-name">{e.dealer_name}</span>
                          <span className="caption">{[SURFACE[e.surface ?? ''], LANGUAGE[e.language ?? ''], ROLE[e.role ?? '']].filter(Boolean).join(' · ') || 'No details'}</span>
                        </td>
                        <td>
                          {e.transcript ? <span dir="auto">{e.transcript}</span> : <span className="muted">Not kept</span>}
                          <span className="caption">{kindText(e)}</span>
                        </td>
                        <td>
                          <Badge tone={r.tone}>{r.text}</Badge>
                          {r.detail && <span className="caption">{r.detail}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            {!done && rows.length >= 50 && (
              <div className="row-c"><button type="button" className="mb-btn mb-btn--secondary" onClick={() => void showOlder()}>Show older</button></div>
            )}
          </>
        )}
      </LoadState>
    </>
  );
}

function kindText(e: MunshiEvent): string {
  const speed = e.latency_ms !== null ? ` · ${millis(e.latency_ms)}` : '';
  if (e.kind === 'transcribe') return `Speech clip${e.audio_ms !== null ? ` · ${Math.round(e.audio_ms / 100) / 10} s` : ''}${speed}`;
  if (e.kind === 'local') return 'Read on the device';
  return `Read by Claude${speed}`;
}

function result(e: MunshiEvent): { text: string; tone: Tone; detail?: string } {
  if (e.status === 'failed') return { text: 'Failed', tone: 'danger', detail: failureText(e.failure) };
  if (e.status === 'off') return { text: 'Not switched on', tone: 'warning', detail: failureText(e.failure) };
  if (e.undone === 1) return { text: 'Undone', tone: 'warning', detail: 'The person took it off the bill' };
  const changed = (e.lines_changed ?? 0) + (e.lines_removed ?? 0);
  if (e.outcome === 'settled') {
    const detail = `${e.lines_kept ?? 0} kept, ${e.lines_changed ?? 0} changed, ${e.lines_removed ?? 0} removed`;
    return changed > 0 ? { text: 'Edited after', tone: 'warning', detail } : { text: 'Kept as spoken', tone: 'success', detail };
  }
  if (e.outcome === 'needs_net') return { text: 'Needed the internet', tone: 'warning', detail: 'A change to a line cannot be read offline' };
  if (e.outcome === 'cancelled') return { text: 'Nothing added', tone: 'neutral', detail: e.lines_total !== null ? `${e.lines_total} lines read, none clear` : undefined };
  if (e.outcome === 'added') return { text: 'Added to the bill', tone: 'neutral', detail: 'Invoice not saved yet' };
  return { text: e.kind === 'transcribe' ? 'Written down' : 'Read', tone: 'neutral' };
}

// ---------- shops ----------

function Shops({ days }: { days: number }) {
  const state = useLoad(() => api.munshiShops(days), [days]);
  const [turnOff, setTurnOff] = useState<MunshiShop | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function turnOn(shop: MunshiShop) {
    setError(null);
    try {
      await api.setMunshiText(shop.id, true);
      state.reload();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <>
      <p className="sub">Each shop can have the sentences its people speak kept for fixing mistakes and training, or switched off. With it off, only counts are kept.</p>
      {error && <Alert tone="danger">{error}</Alert>}
      <LoadState state={state}>
        {state.data && state.data.shops.length === 0 ? (
          <Empty>No shops yet.</Empty>
        ) : (
          state.data && (
            <div className="mb-table-wrap tbl-scroll">
              <table className="mb-table">
                <thead>
                  <tr><th>Shop</th><th className="num">Entries</th><th className="num">Failed</th><th className="num">Kept as spoken</th><th className="num">Cost</th><th>Last used</th><th>Sentences</th></tr>
                </thead>
                <tbody>
                  {state.data.shops.map((s) => (
                    <tr key={s.id}>
                      <td><span className="cell-name">{s.name}</span></td>
                      <td className="num">{s.commands}</td>
                      <td className="num">{s.failed}</td>
                      <td className="num">{percent(s.keptPct)}</td>
                      <td className="num">{usd(s.costMicro)}</td>
                      <td>{s.lastAt ? ago(s.lastAt) : <span className="muted">Never</span>}</td>
                      <td>
                        <Badge tone={s.shareText ? 'success' : 'neutral'}>{s.shareText ? 'Kept' : 'Not kept'}</Badge>{' '}
                        {s.shareText ? (
                          <button type="button" className="link-btn" onClick={() => setTurnOff(s)}>Switch off<span className="visually-hidden"> for {s.name}</span></button>
                        ) : (
                          <button type="button" className="link-btn" onClick={() => void turnOn(s)}>Switch on<span className="visually-hidden"> for {s.name}</span></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </LoadState>
      {turnOff && <TurnOffDialog shop={turnOff} onClose={() => setTurnOff(null)} onDone={() => { setTurnOff(null); state.reload(); }} />}
    </>
  );
}

function TurnOffDialog({ shop, onClose, onDone }: { shop: MunshiShop; onClose: () => void; onDone: () => void }) {
  const save = useSave();
  return (
    <Dialog
      title={`Stop keeping sentences for ${shop.name}?`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="mb-btn mb-btn--danger" disabled={save.busy} onClick={() => void save.run(async () => { await api.setMunshiText(shop.id, false); onDone(); })}>
            {save.busy ? 'Saving…' : 'Switch off and delete the text'}
          </button>
        </>
      }
    >
      <p>New sentences from this shop will not be kept. The sentences already kept for it are deleted now and cannot be brought back. Counts, speed and cost stay.</p>
      {save.error && <Alert tone="danger">{save.error}</Alert>}
    </Dialog>
  );
}
