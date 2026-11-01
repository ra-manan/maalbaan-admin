import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type FeedbackItem, type FeedbackKind, type FeedbackStatus } from '../api';
import { attachments, headline, KIND_LABEL, KINDS, noteLength, STATUS_LABEL, STATUSES } from '../feedback';
import { dayTime } from '../format';
import { pageCount } from '../master';
import { Page } from '../Shell';
import { Alert, Badge, Dialog, Empty, Field, LoadState, useLoad, useSave } from '../ui';

const TONE: Record<FeedbackStatus, 'warning' | 'neutral' | 'success'> = { new: 'warning', seen: 'neutral', working: 'neutral', done: 'success', declined: 'neutral' };

/** The text of a box, held back until the typing rests so a list is not asked for on every key. */
function useRested(value: string, ms = 350): string {
  const [rested, setRested] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setRested(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return rested;
}

/** Bugs, issues and change requests that people in a shop sent from the app, with their voice notes and screenshots. */
export function Feedback() {
  const [text, setText] = useState('');
  const q = useRested(text.trim());
  const [status, setStatus] = useState<FeedbackStatus | ''>('');
  const [kind, setKind] = useState<FeedbackKind | ''>('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<FeedbackItem | null>(null);

  useEffect(() => setPage(1), [q, status, kind]);
  const list = useLoad(() => api.feedback({ q, status, kind, page }), [q, status, kind, page]);
  const pages = list.data ? pageCount(list.data.total, list.data.pageSize) : 1;
  const counts = list.data?.counts;

  return (
    <Page title="Feedback" sub="What shops tell us from inside the app: bugs, things that are hard to do, and changes they want. Newest first.">
      <div className="row-c" role="group" aria-label="Status">
        <button type="button" className={`chip${status === '' ? ' is-on' : ''}`} aria-pressed={status === ''} onClick={() => setStatus('')}>
          All {counts && <span className="count">{counts.all}</span>}
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" className={`chip${status === s ? ' is-on' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS_LABEL[s]} {counts && <span className="count">{counts[s]}</span>}
          </button>
        ))}
      </div>
      <div className="row-c">
        <Field label="Search">{(id) => <input id={id} className="mb-input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Words, shop, person or screen" />}</Field>
        <Field label="Kind">
          {(id) => (
            <select id={id} className="sel" value={kind} onChange={(e) => setKind(e.target.value as FeedbackKind | '')}>
              <option value="">All kinds</option>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          )}
        </Field>
      </div>
      <LoadState state={list}>
        {list.data && (
          list.data.feedback.length === 0 ? (
            <Empty>{q || status || kind ? 'Nothing matches.' : 'Nothing yet. Notes appear here when someone uses the feedback button in the app.'}</Empty>
          ) : (
            <div className="mb-table-wrap tbl-scroll">
              <table className="mb-table">
                <thead><tr><th>What they said</th><th>Kind</th><th>Shop</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {list.data.feedback.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <span className="cell-name">{headline(f.message, f.files, f.audio_ms)}</span>
                        <span className="caption">{[attachments(f.files, f.audio_ms), dayTime(f.created_at)].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td>{KIND_LABEL[f.kind]}</td>
                      <td>
                        <Link to={`/accounts/${f.dealerId}`}>{f.dealerName}</Link>
                        <span className="caption">{[f.user_name, f.role].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td><Badge tone={TONE[f.status]}>{STATUS_LABEL[f.status]}</Badge></td>
                      <td><button type="button" className="link-btn" onClick={() => setOpen(f)}>Open<span className="visually-hidden"> note from {f.dealerName}</span></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </LoadState>
      {pages > 1 && (
        <div className="row-c" role="navigation" aria-label="Pages">
          <button type="button" className="mb-btn mb-btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="caption">Page {page} of {pages}</span>
          <button type="button" className="mb-btn mb-btn--secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {open && <Detail item={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload(); }} />}
    </Page>
  );
}

/** A file a shop sent, shown from a local address (the file needs the sign-in cookie, which a plain link would not carry across sites). */
function useFile(id: string, name: string): { url: string | null; failed: boolean } {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({ url: null, failed: false });
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    api.feedbackFile(id, name).then(
      (blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setState({ url, failed: false });
      },
      () => alive && setState({ url: null, failed: true }),
    );
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, name]);
  return state;
}

function Picture({ id, name, label }: { id: string; name: string; label: string }) {
  const file = useFile(id, name);
  if (file.failed) return <span className="caption">{label} could not be opened.</span>;
  if (!file.url) return <span className="caption">Loading {label.toLowerCase()}…</span>;
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="fb-shot-link">
      <img src={file.url} alt={label} className="fb-shot" />
    </a>
  );
}

function VoiceNote({ id, ms }: { id: string; ms: number | null }) {
  const file = useFile(id, 'audio');
  if (file.failed) return <span className="caption">The voice note could not be opened.</span>;
  if (!file.url) return <span className="caption">Loading the voice note…</span>;
  return <audio controls src={file.url} aria-label={`Voice note, ${noteLength(ms)}`} />;
}

function Detail({ item, onClose, onSaved }: { item: FeedbackItem; onClose: () => void; onSaved: () => void }) {
  const save = useSave();
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [notes, setNotes] = useState(item.notes ?? '');
  const shots = item.files.filter((f) => f.name.startsWith('shot-'));
  const hasVoice = item.files.some((f) => f.name === 'audio');
  const facts = [
    ['Shop', item.dealerName],
    ['Person', [item.user_name, item.role].filter(Boolean).join(' · ') || null],
    ['Screen', item.screen],
    ['Where', item.surface],
    ['Language', item.language === 'ur' ? 'Urdu' : item.language === 'en' ? 'English' : null],
    ['App version', item.app_version],
    ['Sent', dayTime(item.created_at)],
  ] as const;

  function submit() {
    void save.run(async () => {
      const input: { status?: FeedbackStatus; notes?: string } = {};
      if (status !== item.status) input.status = status;
      if (notes.trim() !== (item.notes ?? '')) input.notes = notes.trim();
      if (Object.keys(input).length > 0) await api.updateFeedback(item.id, input);
      onSaved();
    });
  }

  return (
    <Dialog
      title={`${KIND_LABEL[item.kind]} from ${item.dealerName}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Close</button>
          <button type="button" className="mb-btn mb-btn--primary" disabled={save.busy} onClick={submit}>{save.busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="col">
        {item.message ? <p className="fb-message" dir="auto">{item.message}</p> : <p className="sub">No words, only what is below.</p>}
        {hasVoice && <VoiceNote id={item.id} ms={item.audio_ms} />}
        {shots.length > 0 && (
          <div className="row-c" aria-label="Screenshots">
            {shots.map((s, i) => <Picture key={s.name} id={item.id} name={s.name} label={`Screenshot ${i + 1}`} />)}
          </div>
        )}
        <dl className="fb-facts">
          {facts.map(([label, value]) => value && (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Field label="Status">
          {(id) => (
            <select id={id} className="sel" value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          )}
        </Field>
        <Field label="Team notes" hint="Only the team sees these. The shop does not.">
          {(id, d) => <textarea id={id} aria-describedby={d} className="mb-input" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
        {save.error && <Alert tone="danger">{save.error}</Alert>}
      </div>
    </Dialog>
  );
}
