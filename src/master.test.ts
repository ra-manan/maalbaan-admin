import { describe, expect, it } from 'vitest';
import { aliasText, isRoman, pageCount, parseAliases, rowsToAdd, sampleCsv, summaryLine } from './master';

describe('voice names', () => {
  it('are read one per line or comma separated, without blanks or repeats', () => {
    expect(parseAliases('lux sabun\n  Lux  Sabun \n\nلکس, luks ,')).toEqual(['lux sabun', 'لکس', 'luks']);
    expect(parseAliases('')).toEqual([]);
  });
  it('round trip through the box', () => {
    expect(parseAliases(aliasText(['a b', 'لکس']))).toEqual(['a b', 'لکس']);
  });
});

describe('pages', () => {
  it('make at least one page', () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(50, 50)).toBe(1);
    expect(pageCount(51, 50)).toBe(2);
  });
});

describe('English names', () => {
  it('take Latin letters and refuse Urdu', () => {
    expect(isRoman("Lux Soap 98g (Pink) - O'Neil & Co.")).toBe(true);
    expect(isRoman('لکس صابن')).toBe(false);
  });
});

describe('bulk upload helpers', () => {
  it('sums up what the check found', () => {
    expect(summaryLine({ new: 12, existing: 3, similar: 1 })).toBe('12 new, 3 already in the list, 1 looks the same as a name in the list.');
    expect(summaryLine({ new: 0, similar: 2, repeat: 1, invalid: 4 })).toBe('0 new, 2 look the same as a name in the list, 1 twice in the file, 4 cannot be used.');
  });
  it('sends only new rows that were kept, with corrected Urdu', () => {
    const items = [
      { row: 1, status: 'new' as const, nameUr: 'ایک' },
      { row: 2, status: 'existing' as const, nameUr: 'دو' },
      { row: 3, status: 'new' as const, nameUr: 'تین' },
      { row: 4, status: 'new' as const, nameUr: null },
    ];
    expect(rowsToAdd(items, new Set([3]), { 1: ' اک ', 4: '  ' }).map((i) => [i.row, i.nameUr])).toEqual([[1, 'اک'], [4, null]]);
  });
  it('offers a sample for each list', () => {
    expect(sampleCsv('products').split('\n')[0]).toBe('product,company');
    expect(sampleCsv('companies').split('\n')[0]).toBe('company');
  });
});
