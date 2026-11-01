import { describe, expect, it } from 'vitest';
import { aliasText, isRoman, pageCount, parseAliases } from './master';

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
