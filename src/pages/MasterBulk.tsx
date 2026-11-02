import { useState } from 'react';
import { api, type BulkPreview } from '../api';
import { BULK_MAX_ROWS, STATUS_LABEL, STATUS_TONE, rowsToAdd, sampleCsv, summaryLine, type BulkKind } from '../master';
import { Alert, Badge, Dialog, Field, useSave } from '../ui';

/** Downloads the sample file for a list. */
function downloadSample(kind: BulkKind) {
  const url = URL.createObjectURL(new Blob([sampleCsv(kind)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `master-${kind}-sample.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload names from a CSV. Step 1 only checks (nothing is saved): each name is written in Urdu and sorted into new,
 * already in the list, looks the same as one in the list, or twice in the file. Step 2 adds the new ones the person keeps.
 * A name that is in the list is never changed by an upload.
 */
export function BulkDialog({ kind, onClose, onDone }: { kind: BulkKind; onClose: () => void; onDone: () => void }) {
  const check = useSave();
  const add = useSave();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [urdu, setUrdu] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ added: number; addedCompanies: number; skipped: number } | null>(null);
  const label = kind === 'products' ? 'products' : 'companies';

  function runCheck() {
    if (!file) return;
    void check.run(async () => {
      const csv = await file.text();
      const out = await api.bulkPreview(kind, csv);
      setPreview(out);
      setSkip(new Set());
      setUrdu({});
    });
  }

  const toAdd = preview ? rowsToAdd(preview.items, skip, urdu) : [];

  function commit() {
    if (toAdd.length === 0) return;
    void add.run(async () => {
      setResult(await api.bulkCommit(kind, toAdd));
      onDone();
    });
  }

  function toggle(row: number) {
    const next = new Set(skip);
    if (next.has(row)) next.delete(row);
    else next.add(row);
    setSkip(next);
  }

  return (
    <Dialog
      title={`Upload ${label} from a CSV`}
      onClose={onClose}
      wide
      footer={
        result ? (
          <button type="button" className="mb-btn mb-btn--primary" onClick={onClose}>Done</button>
        ) : (
          <>
            <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
            {preview ? (
              <button type="button" className="mb-btn mb-btn--primary" disabled={add.busy || toAdd.length === 0} onClick={commit}>
                {add.busy ? 'Adding…' : `Add ${toAdd.length} ${toAdd.length === 1 ? 'name' : 'names'}`}
              </button>
            ) : (
              <button type="button" className="mb-btn mb-btn--primary" disabled={check.busy || !file} onClick={runCheck}>
                {check.busy ? 'Checking… this can take a minute' : 'Check the file'}
              </button>
            )}
          </>
        )
      }
    >
      {result ? (
        <Alert tone="success" title={`Added ${result.added} ${result.added === 1 ? 'name' : 'names'}.`}>
          {result.addedCompanies > 0 && `${result.addedCompanies} new ${result.addedCompanies === 1 ? 'company was' : 'companies were'} added for them. `}
          {result.skipped > 0 && `${result.skipped} were skipped because they were added by someone else meanwhile. `}
          Nothing that was already in the list was changed.
        </Alert>
      ) : (
        <div className="col">
          {!preview && (
            <>
              <p className="sub">
                A CSV file with {kind === 'products' ? 'the product name, and the company name in a second column if you have it' : 'one company name per line'}. English names only, up to {BULK_MAX_ROWS} at a time.
                Each name is written in Urdu for you, and names that look like ones already in the list are left out. Nothing is saved until you press Add.
              </p>
              <Field label="CSV file">
                {(id) => <input id={id} className="mb-input" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
              </Field>
              <p>
                <button type="button" className="link-btn" onClick={() => downloadSample(kind)}>Download a sample file</button>
              </p>
            </>
          )}
          {preview && (
            <>
              <Alert tone={preview.counts.new > 0 ? 'success' : 'warning'} title={summaryLine(preview.counts)}>
                Tick off any new name you do not want. You can correct the Urdu before adding.
              </Alert>
              <div className="mb-table-wrap tbl-scroll">
                <table className="mb-table">
                  <thead>
                    <tr>
                      <th><span className="visually-hidden">Add</span></th>
                      <th>Row</th>
                      <th>{kind === 'products' ? 'Product' : 'Company'}</th>
                      {kind === 'products' && <th>Company</th>}
                      <th>Urdu name</th>
                      <th>What we found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((i) => (
                      <tr key={i.row}>
                        <td>
                          {i.status === 'new' && <input type="checkbox" aria-label={`Add ${i.name}`} checked={!skip.has(i.row)} onChange={() => toggle(i.row)} />}
                        </td>
                        <td>{i.row}</td>
                        <td><span className="cell-name">{i.name || '—'}</span></td>
                        {kind === 'products' && <td>{i.company ?? <span className="muted">—</span>}</td>}
                        <td>
                          {i.status === 'new' ? (
                            <input
                              className="mb-input"
                              lang="ur"
                              dir="rtl"
                              aria-label={`Urdu name for ${i.name}`}
                              value={urdu[i.row] ?? i.nameUr ?? ''}
                              maxLength={120}
                              onChange={(e) => setUrdu({ ...urdu, [i.row]: e.target.value })}
                            />
                          ) : (
                            <span className="caption" lang="ur" dir="rtl">{i.nameUr ?? ''}</span>
                          )}
                        </td>
                        <td>
                          <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                          {i.matchedWith && <span className="caption">{i.status === 'repeat' ? 'Same as' : 'Matches'} “{i.matchedWith}”</span>}
                          {i.reason && <span className="caption">{i.reason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                <button type="button" className="link-btn" onClick={() => { setPreview(null); setResult(null); }}>Choose another file</button>
              </p>
            </>
          )}
          {(check.error || add.error) && <Alert tone="danger">{check.error ?? add.error}</Alert>}
        </div>
      )}
    </Dialog>
  );
}
