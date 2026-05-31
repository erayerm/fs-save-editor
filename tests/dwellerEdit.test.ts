import { describe, it, expect } from 'vitest';
import { applyCustomization, setStat, setName, setWeapon, setPregnancy, createDwellerAtDoor, setLevel } from '../src/lib/dwellerEdit';

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

describe('createDwellerAtDoor', () => {
  it('spawns at the vault door (savedRoom -1, unassigned) at level 1', () => {
    const d = createDwellerAtDoor({ name: 'Eve', lastName: 'Snow', gender: 1 }, []);
    expect((d as any).savedRoom).toBe(-1);
    expect((d as any).assigned).toBe(false);
    expect(d.experience?.currentLevel).toBe(1);
    expect(d.gender).toBe(1);
    expect(d.name).toBe('Eve');
    expect(d.lastName).toBe('Snow');
    expect(d.stats?.stats).toHaveLength(8);
    expect(d.equipedOutfit?.id).toBe('jumpsuit');
  });

  it('picks the smallest unused serializeId', () => {
    expect(createDwellerAtDoor({ name: 'A', lastName: 'B', gender: 2 }, [1, 2, 4]).serializeId).toBe(3);
    expect(createDwellerAtDoor({ name: 'A', lastName: 'B', gender: 2 }, [1, 2, 3]).serializeId).toBe(4);
    expect(createDwellerAtDoor({ name: 'A', lastName: 'B', gender: 2 }, []).serializeId).toBe(1);
  });

  it('normalizes invalid gender to female and trims/falls back names', () => {
    const d = createDwellerAtDoor({ name: '  ', lastName: '', gender: 9 }, []);
    expect(d.gender).toBe(1);
    expect(d.name).toBe('New');
    expect(d.lastName).toBe('Dweller');
  });
});

describe('setPregnancy', () => {
  const base = () => ({ serializeId: 1, name: 'Eve', lastName: 'X', gender: 1, pregnant: false, babyReady: false } as any);

  it('sets pregnant without disturbing other fields', () => {
    const next = setPregnancy(base(), { pregnant: true });
    expect((next as any).pregnant).toBe(true);
    expect((next as any).babyReady).toBe(false);
    expect(next.name).toBe('Eve');
  });

  it('sets babyReady independently', () => {
    const next = setPregnancy(base(), { babyReady: true });
    expect((next as any).babyReady).toBe(true);
    expect((next as any).pregnant).toBe(false);
  });

  it('leaves untouched flags unchanged when only one is patched', () => {
    const d = { ...base(), pregnant: true } as any;
    const next = setPregnancy(d, { babyReady: true });
    expect((next as any).pregnant).toBe(true);
    expect((next as any).babyReady).toBe(true);
  });

  it('does not mutate the input', () => {
    const d = base();
    setPregnancy(d, { pregnant: true });
    expect((d as any).pregnant).toBe(false);
  });
});

describe('setLevel', () => {
  const base = () => ({
    serializeId: 1, name: 'Bob', lastName: 'X', gender: 2,
    experience: { currentLevel: 10, experienceValue: 5000, needLvUp: true, accum: 3, storage: 2 },
  } as any);

  it('sets currentLevel and resets experience progress', () => {
    const d = setLevel(base(), 25);
    expect(d.experience.currentLevel).toBe(25);
    expect(d.experience.experienceValue).toBe(0);
    expect(d.experience.needLvUp).toBe(false);
    expect(d.experience.accum).toBe(0);
    expect(d.experience.storage).toBe(0);
  });

  it('clamps to 1..50 and rounds', () => {
    expect(setLevel(base(), 0).experience.currentLevel).toBe(1);
    expect(setLevel(base(), 999).experience.currentLevel).toBe(50);
    expect(setLevel(base(), 12.6).experience.currentLevel).toBe(13);
  });

  it('does not mutate the input', () => {
    const d = base();
    setLevel(d, 30);
    expect(d.experience.currentLevel).toBe(10);
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
