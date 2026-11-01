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
