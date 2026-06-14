import { describe, it, expect } from 'vitest';
import { registerLegendaryDiscovery, reconcileLegendaryGuide } from './survivalGuide';
import type { SaveJson } from '../types/save';

const mkSave = (dwellers: any[], guide?: string[]): SaveJson =>
  ({ dwellers: { dwellers }, ...(guide ? { survivalW: { dwellers: guide } } : {}) } as unknown as SaveJson);

describe('registerLegendaryDiscovery', () => {
  it('adds an N-prefixed entry to an empty collection', () => {
    expect(registerLegendaryDiscovery([], 'L_Jericho')).toEqual(['NL_Jericho']);
  });

  it('appends without dropping existing entries', () => {
    expect(registerLegendaryDiscovery(['NL_Preston'], 'L_Jericho')).toEqual(['NL_Preston', 'NL_Jericho']);
  });

  it('does not duplicate when already collected (N prefix)', () => {
    const list = ['NL_Jericho'];
    expect(registerLegendaryDiscovery(list, 'L_Jericho')).toEqual(['NL_Jericho']);
  });

  it('does not duplicate when already viewed (O prefix)', () => {
    const list = ['OL_AlistairTenpenny'];
    expect(registerLegendaryDiscovery(list, 'L_AlistairTenpenny')).toEqual(['OL_AlistairTenpenny']);
  });

  it('matches uniqueData with spaces correctly', () => {
    const list = ['NL_Abraham Washington'];
    expect(registerLegendaryDiscovery(list, 'L_Abraham Washington')).toEqual(['NL_Abraham Washington']);
  });
});

describe('reconcileLegendaryGuide', () => {
  it('adds guide entries for roster legendaries that are missing', () => {
    const save = mkSave([{ serializeId: 1, rarity: 'Legendary', uniqueData: 'L_Jericho' }], []);
    const out = reconcileLegendaryGuide(save);
    expect((out.survivalW as any).dwellers).toEqual(['NL_Jericho']);
  });

  it('creates survivalW.dwellers when absent', () => {
    const save = mkSave([{ serializeId: 1, rarity: 'Legendary', uniqueData: 'L_Jericho' }]);
    expect(((reconcileLegendaryGuide(save).survivalW as any)).dwellers).toEqual(['NL_Jericho']);
  });

  it('does NOT add entries for legendaries no longer in the roster (add-then-evict)', () => {
    // Jericho was evicted before export: not in roster, and not already collected.
    const save = mkSave([{ serializeId: 1, rarity: 'Normal' }], []);
    expect(reconcileLegendaryGuide(save)).toBe(save); // unchanged (same reference)
    expect((reconcileLegendaryGuide(save).survivalW as any).dwellers).toEqual([]);
  });

  it('preserves already-collected entries whose dweller is gone, and dedupes', () => {
    // Guide has Preston (collected, dweller gone) + Jericho still in roster.
    const save = mkSave(
      [{ serializeId: 2, rarity: 'Legendary', uniqueData: 'L_Jericho' }],
      ['OL_Preston', 'NL_Jericho'],
    );
    const out = reconcileLegendaryGuide(save);
    expect((out.survivalW as any).dwellers).toEqual(['OL_Preston', 'NL_Jericho']);
  });

  it('ignores non-legendary dwellers', () => {
    const save = mkSave([{ serializeId: 1, rarity: 'Rare', uniqueData: 'TheMayorMale' }], []);
    expect(reconcileLegendaryGuide(save)).toBe(save);
  });

  it('registers every legendary when several are added at once (multi-select)', () => {
    const save = mkSave([
      { serializeId: 1, rarity: 'Legendary', uniqueData: 'L_Jericho' },
      { serializeId: 2, rarity: 'Legendary', uniqueData: 'L_Preston' },
      { serializeId: 3, rarity: 'Legendary', uniqueData: 'L_Moira Brown' },
    ], []);
    expect((reconcileLegendaryGuide(save).survivalW as any).dwellers)
      .toEqual(['NL_Jericho', 'NL_Preston', 'NL_Moira Brown']);
  });
});
