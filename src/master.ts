/** Small pure helpers for the Master lists page. */

/** Voice names are typed one per line (commas work too); blanks and repeats (any case) are dropped. */
export function parseAliases(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]+/)) {
    const alias = raw.trim().replace(/\s+/g, ' ');
    const key = alias.toLowerCase();
    if (alias === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

export const aliasText = (aliases: readonly string[]): string => aliases.join('\n');

/** "Page 2 of 5" arithmetic: how many pages a total makes, never fewer than one. */
export const pageCount = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

/** Names that look like an English name: Latin letters with accents and the usual marks (the server checks the same). */
// eslint-disable-next-line no-control-regex
export const isRoman = (text: string): boolean => /^[\u0000-ɏ‐-‧‰-⁞₠-⃏]*$/.test(text);

// ---------- bulk upload ----------

export type BulkKind = 'products' | 'companies';
export type BulkStatus = 'new' | 'existing' | 'similar' | 'repeat' | 'invalid';

export const BULK_MAX_ROWS = 200;

/** The file a person can start from: one name per line, products may name their company. */
export const sampleCsv = (kind: BulkKind): string => (kind === 'products' ? 'product,company\nDanedar 950g,Tapal\nLux Soap 98g,Unilever\n' : 'company\nTapal\nUnilever\n');

export const STATUS_LABEL: Record<BulkStatus, string> = {
  new: 'New',
  existing: 'Already in the list',
  similar: 'Looks the same as one in the list',
  repeat: 'Twice in this file',
  invalid: 'Cannot use',
};

export const STATUS_TONE: Record<BulkStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  new: 'success',
  existing: 'neutral',
  similar: 'warning',
  repeat: 'neutral',
  invalid: 'danger',
};

/** One sentence on what the check found, e.g. "12 new, 3 already in the list, 1 looks the same." */
export function summaryLine(counts: Partial<Record<BulkStatus, number>>): string {
  const n = (k: BulkStatus) => counts[k] ?? 0;
  const parts = [`${n('new')} new`];
  if (n('existing')) parts.push(`${n('existing')} already in the list`);
  if (n('similar')) parts.push(`${n('similar')} look${n('similar') === 1 ? 's' : ''} the same as a name in the list`);
  if (n('repeat')) parts.push(`${n('repeat')} twice in the file`);
  if (n('invalid')) parts.push(`${n('invalid')} cannot be used`);
  return `${parts.join(', ')}.`;
}

/** The rows to send: only new rows the person kept, with the Urdu they may have corrected (an empty box sends none). */
export function rowsToAdd<T extends { row: number; status: BulkStatus; nameUr: string | null }>(items: readonly T[], skip: ReadonlySet<number>, urdu: Readonly<Record<number, string>>): T[] {
  return items
    .filter((i) => i.status === 'new' && !skip.has(i.row))
    .map((i) => ({ ...i, nameUr: (urdu[i.row] ?? i.nameUr ?? '').trim() || null }));
}
