import { describe, expect, it } from 'vitest';
import { attachments, headline, noteLength } from './feedback';

describe('feedback helpers', () => {
  it('writes a voice note length as minutes and seconds', () => {
    expect(noteLength(null)).toBe('0:00');
    expect(noteLength(4200)).toBe('0:04');
    expect(noteLength(75_000)).toBe('1:15');
  });

  it('says what a report carries', () => {
    expect(attachments([], null)).toBe('');
    expect(attachments([{ name: 'audio' }, { name: 'shot-0' }, { name: 'shot-1' }], 12_000)).toBe('Voice note 0:12 · 2 screenshots');
    expect(attachments([{ name: 'shot-0' }], null)).toBe('1 screenshot');
  });

  it('shortens the words for a list, or falls back to the attachments', () => {
    expect(headline('  The   receipt\n is cut off ', [], null)).toBe('The receipt is cut off');
    expect(headline('x'.repeat(200), [], null)).toHaveLength(140);
    expect(headline(null, [{ name: 'shot-0' }], null)).toBe('1 screenshot');
    expect(headline('', [], null)).toBe('No details');
  });
});
