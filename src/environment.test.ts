import { describe, expect, it } from 'vitest';
import { apiBaseFor, readEnvironment } from './environment';

const stored = (value: string | null) => ({ getItem: () => value });

describe('environment', () => {
  it('is live unless staging was chosen on this browser', () => {
    expect(readEnvironment(stored(null))).toBe('live');
    expect(readEnvironment(stored('staging'))).toBe('staging');
    expect(readEnvironment(stored('anything else'))).toBe('live');
    expect(readEnvironment(null)).toBe('live');
    expect(readEnvironment({ getItem: () => { throw new Error('blocked'); } })).toBe('live');
  });

  it('picks the API address for the environment', () => {
    expect(apiBaseFor('live', undefined, true)).toBe('https://api.maalbaan.com');
    expect(apiBaseFor('staging', undefined, true)).toBe('https://api-staging.maalbaan.com');
  });

  it('keeps a fixed address and the development proxy as they are', () => {
    expect(apiBaseFor('staging', 'https://example.test', true)).toBe('https://example.test');
    expect(apiBaseFor('staging', undefined, false)).toBe('');
  });
});
