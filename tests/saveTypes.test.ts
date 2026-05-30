import { describe, it, expect } from 'vitest';
import type { Dweller, DwellerStat } from '../src/types/save';
import { SPECIAL_ORDER } from '../src/types/save';

describe('save types', () => {
  it('exposes the SPECIAL order S..L', () => {
    expect(SPECIAL_ORDER).toEqual(['S', 'P', 'E', 'C', 'I', 'A', 'L']);
  });
  it('Dweller stat shape compiles', () => {
    const s: DwellerStat = { value: 5, mod: 0, exp: 0 };
    const d: Partial<Dweller> = { stats: { stats: [s, s, s, s, s, s, s, s] } };
    expect(d.stats!.stats.length).toBe(8);
  });
});
