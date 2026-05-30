import { describe, it, expect } from 'vitest';
import { getCaps, setCaps, getLunchboxes, setLunchboxes, setResource } from '../src/lib/vaultEdit';

const save = () => ({
  vault: { storage: { resources: { Nuka: 100, Food: 50 } }, LunchBoxesCount: 2 },
  dwellers: { dwellers: [] },
} as any);

describe('vaultEdit', () => {
  it('reads and writes caps (Nuka) immutably', () => {
    const s = save();
    expect(getCaps(s)).toBe(100);
    const s2 = setCaps(s, 999);
    expect(getCaps(s2)).toBe(999);
    expect(getCaps(s)).toBe(100);
    expect(s2.vault.storage.resources.Food).toBe(50);
  });
  it('reads and writes lunchbox count', () => {
    expect(getLunchboxes(save())).toBe(2);
    expect(getLunchboxes(setLunchboxes(save(), 7))).toBe(7);
  });
  it('setResource clamps negatives to 0', () => {
    expect(setResource(save(), 'Food', -5).vault.storage.resources.Food).toBe(0);
  });
});
