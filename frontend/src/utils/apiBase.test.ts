import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiBase } from './apiBase';

describe('getApiBase', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns string', () => {
    const base = getApiBase();
    expect(typeof base).toBe('string');
  });

  it('does not end with /api', () => {
    const base = getApiBase();
    expect(base.endsWith('/api')).toBe(false);
  });
});
