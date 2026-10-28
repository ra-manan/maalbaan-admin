import { describe, expect, it } from 'vitest';
import { addMonths, ago, dateText, licenseBadge, phoneText, pkr, whatsappDigits } from './format';

describe('format', () => {
  it('writes money and dates the Maalban way', () => {
    expect(pkr(124500)).toBe('PKR 124,500');
    expect(dateText('2026-10-28')).toBe('28 Oct 2026');
    expect(phoneText('03001234567')).toBe('0300 1234567');
    expect(whatsappDigits('0300 1234567')).toBe('923001234567');
  });

  it('says how long ago', () => {
    const now = Date.UTC(2026, 9, 28, 12);
    expect(ago(null, now)).toBe('Never');
    expect(ago(now - 30_000, now)).toBe('Just now');
    expect(ago(now - 2 * 60_000, now)).toBe('2 min ago');
    expect(ago(now - 3_600_000, now)).toBe('1 hour ago');
    expect(ago(now - 86_400_000, now)).toBe('Yesterday');
    expect(ago(now - 3 * 86_400_000, now)).toBe('3 days ago');
  });

  it('labels the licence like the design', () => {
    expect(licenseBadge({ state: 'active', daysLeft: 23, graceLeft: null })).toEqual({ text: 'Active · 23 days', tone: 'success' });
    expect(licenseBadge({ state: 'active', daysLeft: 9, graceLeft: null }, true).text).toBe('Trial · 9 days');
    expect(licenseBadge({ state: 'expiring', daysLeft: 5, graceLeft: null })).toEqual({ text: 'Expires in 5 days', tone: 'warning' });
    expect(licenseBadge({ state: 'grace', daysLeft: -1, graceLeft: 2 }).text).toBe('Grace period · 2 days left');
    expect(licenseBadge({ state: 'expired', daysLeft: -3, graceLeft: null })).toEqual({ text: 'Read-only · ended 3 days ago', tone: 'danger' });
    expect(licenseBadge({ state: 'suspended', daysLeft: 40, graceLeft: null }).tone).toBe('danger');
  });

  it('adds months without spilling into the next one', () => {
    expect(addMonths('2026-10-28', 1)).toBe('2026-11-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 12)).toBe('2027-11-15');
    expect(addMonths('2026-12-31', 2)).toBe('2027-02-28');
  });
});
