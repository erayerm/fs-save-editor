import { describe, it, expect } from 'vitest';
import { applyCustomization, setStat, setName, setWeapon } from '../src/lib/dwellerEdit';

describe('applyCustomization facialHair', () => {
  it('sets the facial hair field (save key "faceMask") without disturbing other fields', () => {
    const d = { serializeId: 1, name: 'Bob', lastName: 'X', gender: 2 } as any;
    const next = applyCustomization(d, { facialHair: 'f_hair_11' });
    expect((next as any).faceMask).toBe('f_hair_11');
    expect(next.name).toBe('Bob');
  });

  it('clears the facial hair field when set to null', () => {
    const d = { serializeId: 1, name: 'Bob', lastName: 'X', gender: 2, faceMask: 'f_hair_11' } as any;
    const next = applyCustomization(d, { facialHair: null });
    expect((next as any).faceMask).toBeNull();
    expect(next.name).toBe('Bob');
  });
});

describe('setStat, setName, setWeapon', () => {
  const base = () => ({
    serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2,
    stats: { stats: Array.from({ length: 8 }, () => ({ value: 1, mod: 0, exp: 0 })) },
    equipedWeapon: { id: 'Fist', type: 'Weapon' },
  } as any);

  it('setStat updates the S..L slot (1-based) and clamps to 1..10', () => {
    const d = setStat(base(), 'S', 99);
    expect(d.stats.stats[1].value).toBe(10);
    expect(d.stats.stats[0].value).toBe(1);
    expect(setStat(base(), 'L', 0).stats.stats[7].value).toBe(1);
  });

  it('setName trims and updates name/lastName', () => {
    const d = setName(base(), { name: ' Alice ', lastName: 'Smith' });
    expect(d.name).toBe('Alice');
    expect(d.lastName).toBe('Smith');
  });

  it('setWeapon swaps the equipped weapon id, keeping the ref shape', () => {
    const d = setWeapon(base(), 'Railgun');
    expect(d.equipedWeapon.id).toBe('Railgun');
    expect(d.equipedWeapon.type).toBe('Weapon');
  });
});
