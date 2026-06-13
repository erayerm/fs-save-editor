import { describe, it, expect } from 'vitest';
import { sortByDamage, filterAndSortOutfits, type SpecialKey } from './pickerSort';

describe('sortByDamage', () => {
  const w = (id: string, damageMin: number, damageMax: number) => ({ id, damageMin, damageMax });
  it('sorts ascending by average damage', () => {
    const out = sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'asc');
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('sorts descending by average damage', () => {
    const out = sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'desc');
    expect(out.map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('filterAndSortOutfits', () => {
  const o = (id: string, special: Partial<Record<SpecialKey, number>>) => ({ id, special });
  const items = [o('x', { S: 3 }), o('y', { S: 1, E: 2 }), o('z', { E: 5 })];
  it('keeps only outfits granting the selected stat, sorted desc by that stat', () => {
    const out = filterAndSortOutfits(items, 'S', 'desc');
    expect(out.map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('sorts ascending when asked', () => {
    const out = filterAndSortOutfits(items, 'S', 'asc');
    expect(out.map((i) => i.id)).toEqual(['y', 'x']);
  });
  it('returns all items unchanged when stat is null', () => {
    const out = filterAndSortOutfits(items, null, 'desc');
    expect(out.map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });
});
