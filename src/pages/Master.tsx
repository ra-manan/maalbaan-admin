import { useEffect, useState, type FormEvent } from 'react';
import { api, type MasterCompany, type MasterProduct, type MasterStatus } from '../api';
import { dayTime } from '../format';
import { aliasText, isRoman, pageCount, parseAliases } from '../master';
import { Page } from '../Shell';
import { BulkDialog } from './MasterBulk';
import { Alert, Badge, Dialog, Empty, Field, LoadState, messageOf, useLoad, useSave } from '../ui';

type Kind = 'products' | 'companies';
const STATUSES: { key: MasterStatus | ''; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Offered to shops' },
  { key: 'hidden', label: 'Hidden' },
];

/** The text of a box, held back until the typing rests so a list is not asked for on every key. */
function useRested(value: string, ms = 350): string {
  const [rested, setRested] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setRested(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return rested;
}

/** The company and product names every shop adds, and that shops pick from. Names only: no price or stock is kept. */
export function Master() {
  const [kind, setKind] = useState<Kind>('products');
  const [text, setText] = useState('');
  const q = useRested(text.trim());
  const [status, setStatus] = useState<MasterStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ product?: MasterProduct; company?: MasterCompany; adding?: Kind } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);

  useEffect(() => setPage(1), [kind, q, status]);
  const query = { q, status, page };
  const products = useLoad(() => (kind === 'products' ? api.masterProducts(query) : Promise.resolve(null)), [kind, q, status, page]);
  const companies = useLoad(() => (kind === 'companies' ? api.masterCompanies(query) : Promise.resolve(null)), [kind, q, status, page]);
  const state = kind === 'products' ? products : companies;
  const total = (kind === 'products' ? products.data?.total : companies.data?.total) ?? 0;
  const pageSize = (kind === 'products' ? products.data?.pageSize : companies.data?.pageSize) ?? 50;
  const pages = pageCount(total, pageSize);
  const reload = () => {
    products.reload();
    companies.reload();
  };

  async function toggle(row: MasterProduct | MasterCompany) {
    setNotice(null);
    const next: MasterStatus = row.status === 'active' ? 'hidden' : 'active';
    try {
      await (kind === 'products' ? api.editMasterProduct(row.id, { status: next }) : api.editMasterCompany(row.id, { status: next }));
      reload();
    } catch (e) {
      setNotice(messageOf(e));
    }
  }

  return (
    <Page
      title="Master lists"
      sub="Company and product names that every shop adds to and picks from. Names only: no price, stock or customer is ever kept here."
      actions={
        <>
          <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setBulk(true)}>
            Upload a CSV
          </button>
          <button type="button" className="mb-btn mb-btn--primary" onClick={() => setEditing({ adding: kind })}>
            {kind === 'products' ? 'Add a product' : 'Add a company'}
          </button>
        </>
      }
    >
      <div className="row-c" role="group" aria-label="Which list">
        <button type="button" className={`chip${kind === 'products' ? ' is-on' : ''}`} aria-pressed={kind === 'products'} onClick={() => setKind('products')}>
          Products {kind === 'products' && products.data && <span className="count">{products.data.total}</span>}
        </button>
        <button type="button" className={`chip${kind === 'companies' ? ' is-on' : ''}`} aria-pressed={kind === 'companies'} onClick={() => setKind('companies')}>
          Companies {kind === 'companies' && companies.data && <span className="count">{companies.data.total}</span>}
        </button>
      </div>
      <div className="row-c">
        <Field label="Search">{(id) => <input id={id} className="mb-input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'products' ? 'Name, Urdu name, voice name or company' : 'Name or Urdu name'} />}</Field>
        <Field label="Show">
          {(id) => (
            <select id={id} className="sel" value={status} onChange={(e) => setStatus(e.target.value as MasterStatus | '')}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}
        </Field>
      </div>
      {notice && <Alert tone="danger">{notice}</Alert>}
      <LoadState state={state}>
        {kind === 'products' && products.data && (
          products.data.products.length === 0 ? (
            <Empty>{q || status ? 'No product matches.' : 'No products yet. Shops send their product names here as they add them.'}</Empty>
          ) : (
            <div className="mb-table-wrap tbl-scroll">
              <table className="mb-table">
                <thead><tr><th>Product</th><th>Company</th><th>Voice names</th><th>Shops</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {products.data.products.map((p) => (
                    <tr key={p.id}>
                      <td><span className="cell-name">{p.name}</span><span className="caption" lang="ur" dir="rtl">{p.name_ur ?? ''}</span></td>
                      <td>{p.company_name ?? <span className="muted">—</span>}</td>
                      <td>{p.aliases.length === 0 ? <span className="muted">None</span> : <span className="caption">{p.aliases.join(', ')}</span>}</td>
                      <td>{p.shops}</td>
                      <td><Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status === 'active' ? 'Offered' : 'Hidden'}</Badge><span className="caption">{p.created_by === 'admin' ? 'Added here' : 'Added by a shop'} · {dayTime(p.created_at)}</span></td>
                      <td>
                        <button type="button" className="link-btn" onClick={() => setEditing({ product: p })}>Edit<span className="visually-hidden"> {p.name}</span></button>{' '}
                        <button type="button" className="link-btn" onClick={() => void toggle(p)}>{p.status === 'active' ? 'Hide' : 'Show'}<span className="visually-hidden"> {p.name}</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {kind === 'companies' && companies.data && (
          companies.data.companies.length === 0 ? (
            <Empty>{q || status ? 'No company matches.' : 'No companies yet. Shops send their company names here as they add them.'}</Empty>
          ) : (
            <div className="mb-table-wrap tbl-scroll">
              <table className="mb-table">
                <thead><tr><th>Company</th><th>Products</th><th>Shops</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {companies.data.companies.map((c) => (
                    <tr key={c.id}>
                      <td><span className="cell-name">{c.name}</span><span className="caption" lang="ur" dir="rtl">{c.name_ur ?? ''}</span></td>
                      <td>{c.products}</td>
                      <td>{c.shops}</td>
                      <td><Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status === 'active' ? 'Offered' : 'Hidden'}</Badge><span className="caption">{c.created_by === 'admin' ? 'Added here' : 'Added by a shop'} · {dayTime(c.created_at)}</span></td>
                      <td>
                        <button type="button" className="link-btn" onClick={() => setEditing({ company: c })}>Edit<span className="visually-hidden"> {c.name}</span></button>{' '}
                        <button type="button" className="link-btn" onClick={() => void toggle(c)}>{c.status === 'active' ? 'Hide' : 'Show'}<span className="visually-hidden"> {c.name}</span></button>
                      </td>
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
      {bulk && <BulkDialog kind={kind} onClose={() => setBulk(false)} onDone={reload} />}
      {editing && <EditDialog target={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Page>
  );
}

function EditDialog({ target, onClose, onSaved }: { target: { product?: MasterProduct; company?: MasterCompany; adding?: Kind }; onClose: () => void; onSaved: () => void }) {
  const { product, company } = target;
  const isProduct = product !== undefined || target.adding === 'products';
  const row = product ?? company;
  const save = useSave();
  const [name, setName] = useState(row?.name ?? '');
  const [nameUr, setNameUr] = useState(row?.name_ur ?? '');
  const [aliases, setAliases] = useState(aliasText(product?.aliases ?? []));
  const [companyText, setCompanyText] = useState(product?.company_name ?? '');
  const rested = useRested(companyText.trim());
  const found = useLoad(() => (isProduct && rested.length >= 2 ? api.masterCompanies({ q: rested, status: '', page: 1 }) : Promise.resolve(null)), [rested, isProduct]);
  const options = found.data?.companies ?? [];
  const [problem, setProblem] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setProblem(null);
    if (name.trim() === '' || !isRoman(name)) return setProblem('Give an English name, written in Latin letters.');
    void save.run(async () => {
      const input: Parameters<typeof api.editMasterProduct>[1] = { name: name.trim(), nameUr: nameUr.trim() || null };
      if (isProduct) {
        input.aliases = parseAliases(aliases);
        const wanted = companyText.trim().toLowerCase();
        if (wanted === '') input.companyId = null;
        else if (wanted === (product?.company_name ?? '').toLowerCase()) input.companyId = product?.company_id ?? null;
        else {
          const match = options.find((c) => c.name.toLowerCase() === wanted);
          if (!match) {
            setProblem('Pick the company from the suggestions. A company that is not there is added first, on the Companies list.');
            return;
          }
          input.companyId = match.id;
        }
      }
      if (product) await api.editMasterProduct(product.id, input);
      else if (company) await api.editMasterCompany(company.id, input);
      else if (isProduct) await api.addMasterProduct(input);
      else await api.addMasterCompany(input);
      onSaved();
    });
  }

  return (
    <Dialog title={row ? `Edit ${row.name}` : isProduct ? 'Add a product' : 'Add a company'} onClose={onClose} wide>
      <form className="col" onSubmit={submit}>
        <Field label="English name" hint="Latin letters only. Two shops writing the same name make one row.">{(id, d) => <input id={id} aria-describedby={d} className="mb-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoComplete="off" />}</Field>
        <Field label="Urdu name">{(id) => <input id={id} className="mb-input" lang="ur" dir="rtl" value={nameUr} onChange={(e) => setNameUr(e.target.value)} maxLength={120} autoComplete="off" />}</Field>
        {isProduct && (
          <>
            <Field label="Company" hint="Start typing and pick one from the suggestions. Leave empty for none.">
              {(id, d) => (
                <>
                  <input id={id} aria-describedby={d} className="mb-input" list={`${id}-list`} value={companyText} onChange={(e) => setCompanyText(e.target.value)} autoComplete="off" />
                  <datalist id={`${id}-list`}>{options.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                </>
              )}
            </Field>
            <Field label="Voice names" hint="The words people say for it, one per line (English or Urdu).">{(id, d) => <textarea id={id} aria-describedby={d} className="mb-input" value={aliases} onChange={(e) => setAliases(e.target.value)} />}</Field>
          </>
        )}
        {(problem || save.error) && <Alert tone="danger">{problem ?? save.error}</Alert>}
        <div className="dialog-foot">
          <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="mb-btn mb-btn--primary" disabled={save.busy}>{save.busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  );
}
