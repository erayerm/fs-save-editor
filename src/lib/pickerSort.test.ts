import { describe, it, expect } from 'vitest';
import { sortByDamage, filterAndSortOutfits, filterByText, type SpecialKey } from './pickerSort';

describe('sortByDamage', () => {
  const w = (id: string, damageMin: number, damageMax: number) => ({ id, damageMin, damageMax });
  it('sorts ascending by average damage', () => {
    expect(sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'asc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('sorts descending by average damage', () => {
    expect(sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'desc').map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
  it('returns original order (copy) when dir is default', () => {
    const input = [w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)];
    const out = sortByDamage(input, 'default');
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(input);
  });
});

describe('filterAndSortOutfits', () => {
  const o = (id: string, special: Partial<Record<SpecialKey, number>>) => ({ id, special });
  const items = [o('x', { S: 3 }), o('y', { S: 1, E: 2 }), o('z', { E: 5 })];
  it('filters + sorts desc by the stat', () => {
    expect(filterAndSortOutfits(items, 'S', 'desc').map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('filters + sorts asc by the stat', () => {
    expect(filterAndSortOutfits(items, 'S', 'asc').map((i) => i.id)).toEqual(['y', 'x']);
  });
  it('filters but keeps original order when dir is default', () => {
    expect(filterAndSortOutfits(items, 'S', 'default').map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('returns all items unchanged when stat is null', () => {
    expect(filterAndSortOutfits(items, null, 'desc').map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });
});

describe('filterByText', () => {
  const items = [{ id: 'a', t: 'German Shepherd' }, { id: 'b', t: 'Persian Cat' }, { id: 'c', t: 'Husky' }];
  const get = (i: { t: string }) => i.t;
  it('returns all items when query is empty/whitespace', () => {
    expect(filterByText(items, '   ', get)).toBe(items);
  });
  it('matches case-insensitive substring', () => {
    expect(filterByText(items, 'sh', get).map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('returns empty when nothing matches', () => {
    expect(filterByText(items, 'zzz', get)).toEqual([]);
  });
});
