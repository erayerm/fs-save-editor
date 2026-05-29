import { describe, it, expect } from 'vitest';
import { applyCustomization, type DwellerCustomization } from './dwellerEdit';
import { decodeArgb } from './colors';
import type { Dweller } from '../types/save';

function mkDweller(): Dweller {
  return {
    serializeId: 1, name: 'Test', lastName: 'One', gender: 1,
    hair: '5', equipedOutfit: { id: 'jumpsuit' }, skinColor: 0,
  } as unknown as Dweller;
}

describe('applyCustomization', () => {
  it('returns a new object (does not mutate the input)', () => {
    const d = mkDweller();
    const next = applyCustomization(d, { hair: '21' });
    expect(next).not.toBe(d);
    expect((d as any).hair).toBe('5');
    expect((next as any).hair).toBe('21');
  });

  it('sets the outfit id without dropping other equipedOutfit fields', () => {
    const d = { ...mkDweller(), equipedOutfit: { id: 'jumpsuit', extra: 7 } } as any;
    const next = applyCustomization(d, { outfitId: 'longcoat' }) as any;
    expect(next.equipedOutfit).toEqual({ id: 'longcoat', extra: 7 });
  });

  it('encodes color patches into ARGB ints', () => {
    const patch: DwellerCustomization = { skinColor: { r: 10, g: 20, b: 30, a: 255 } };
    const next = applyCustomization(mkDweller(), patch) as any;
    expect(decodeArgb(next.skinColor)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
  });

  it('ignores undefined fields in the patch', () => {
    const next = applyCustomization(mkDweller(), {}) as any;
    expect(next.hair).toBe('5');
  });
});
