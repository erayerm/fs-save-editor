import { describe, it, expect } from 'vitest';
import { applyCustomization, type DwellerCustomization, setPet, clearPet, setGender, createLegendaryDweller, LEGENDARY_MIN_LEVEL, LEGENDARY_MAX_LEVEL } from './dwellerEdit';
import type { PetMeta } from '../types/pets';
import { decodeArgb } from './colors';
import type { Dweller } from '../types/save';
import type { LegendaryMeta } from '../types/legendary';

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

const PET: PetMeta = {
  id: 'germanshepherd_l', name: 'German Shepherd', type: 'Dog', breed: 'German Shepherd',
  rarity: 'Legendary', bonus: 'ObjectiveMultiplier', bonusValue: 3,
  bonusLabel: 'ObjectiveMultiplier +3', uniqueName: 'Dogmeat', icon: null,
};

describe('setPet / clearPet', () => {
  it('writes equippedPet with extraData', () => {
    const next = setPet(mkDweller(), PET) as any;
    expect(next.equippedPet).toEqual({
      id: 'germanshepherd_l', type: 'Pet',
      hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false,
      extraData: { uniqueName: 'Dogmeat', bonus: 'ObjectiveMultiplier', bonusValue: 3 },
    });
  });
  it('clearPet removes equippedPet', () => {
    const withPet = setPet(mkDweller(), PET);
    const cleared = clearPet(withPet) as any;
    expect(cleared.equippedPet).toBeUndefined();
  });
  it('does not mutate the input', () => {
    const d = mkDweller();
    setPet(d, PET);
    expect((d as any).equippedPet).toBeUndefined();
  });
});

describe('setGender', () => {
  it('sets gender to male (2) / female (1)', () => {
    expect((setGender(mkDweller(), 2) as any).gender).toBe(2);
    expect((setGender(mkDweller(), 1) as any).gender).toBe(1);
  });
  it('coerces any non-2 value to female (1)', () => {
    expect((setGender(mkDweller(), 9) as any).gender).toBe(1);
  });
  it('does not mutate the input', () => {
    const d = mkDweller();
    setGender(d, 2);
    expect(d.gender).toBe(1);
  });

  // A minimal sprite index: hair "01" exists for both genders (default), the
  // male-only hair "m1" and female-only hair "f1"; outfits "ninja" (male-only),
  // "weddingdress" (female-only) and "battlearmor" (both). "jumpsuit" is the default.
  const IDX = {
    version: 1,
    byType: {
      hair: [
        { name: '01', gender: 'male', flags: {} },
        { name: '01', gender: 'female', flags: {} },
        { name: 'm1', gender: 'male', flags: {} },
        { name: 'f1', gender: 'female', flags: {} },
      ],
      outfit: [],
      faceMask: [
        { name: 'f_hair_11', gender: 'male', flags: {} },
        { name: 'wrinkles', gender: 'male', flags: {} },
        { name: 'wrinkles', gender: 'female', flags: {} },
        { name: 'monocle', gender: 'female', flags: {} },
      ],
    },
    outfitItems: [
      { id: 'jumpsuit', name: 'Vault Suit', category: 3, pieceMale: 'jumpsuit', pieceFemale: 'jumpsuit' },
      { id: 'ninja', name: 'Ninja Outfit', category: 2, pieceMale: 'ninja', pieceFemale: null },
      { id: 'weddingdress', name: 'Wedding Dress', category: 2, pieceMale: null, pieceFemale: 'weddingdress' },
      { id: 'battlearmor', name: 'Battle Armor', category: 2, pieceMale: 'battlearmor', pieceFemale: 'battlearmor' },
    ],
  } as any;

  it('resets gender-specific hair to the new gender default', () => {
    const d = { ...mkDweller(), gender: 2, hair: 'm1' } as any;
    const next = setGender(d, 1, IDX) as any;
    expect(next.gender).toBe(1);
    expect(next.hair).toBe('01'); // m1 has no female art -> default
  });

  it('keeps hair that has art for the new gender', () => {
    const d = { ...mkDweller(), gender: 1, hair: '01' } as any;
    expect((setGender(d, 2, IDX) as any).hair).toBe('01');
  });

  it('resets a gender-specific outfit to the jumpsuit', () => {
    const d = { ...mkDweller(), gender: 1, equipedOutfit: { id: 'weddingdress', type: 'Outfit' } } as any;
    const next = setGender(d, 2, IDX) as any;
    expect(next.equipedOutfit).toEqual({ id: 'jumpsuit', type: 'Outfit' });
  });

  it('keeps a unisex outfit across a gender change', () => {
    const d = { ...mkDweller(), gender: 2, equipedOutfit: { id: 'battlearmor' } } as any;
    expect((setGender(d, 1, IDX) as any).equipedOutfit.id).toBe('battlearmor');
  });

  it('clears a male-only faceMask (beard) when switching to female', () => {
    const d = { ...mkDweller(), gender: 2, faceMask: 'f_hair_11' } as any;
    expect((setGender(d, 1, IDX) as any).faceMask).toBeNull();
  });

  it('keeps a faceMask that has art for the new gender', () => {
    const d = { ...mkDweller(), gender: 2, faceMask: 'wrinkles' } as any;
    expect((setGender(d, 1, IDX) as any).faceMask).toBe('wrinkles');
  });

  it('clears a faceMask with no art for the new gender', () => {
    const d = { ...mkDweller(), gender: 1, faceMask: 'monocle' } as any;
    expect((setGender(d, 2, IDX) as any).faceMask).toBeNull();
  });

  it('leaves items untouched when no index is provided', () => {
    const d = { ...mkDweller(), gender: 2, hair: 'm1', equipedOutfit: { id: 'ninja' } } as any;
    const next = setGender(d, 1) as any;
    expect(next.hair).toBe('m1');
    expect(next.equipedOutfit.id).toBe('ninja');
  });
});

const JERICHO: LegendaryMeta = {
  uniqueData: 'L_Jericho', name: 'Jericho', lastName: '', gender: 2,
  special: [8, 6, 8, 2, 3, 7, 6], outfitId: 'WandererArmor_Heavy',
  weaponId: 'AssaultRifle_Infiltrator', skinColor: 0xffe9d4b4, hairColor: 0xff695949,
  hair: null, faceMask: 'f_hair_11',
};
const MOIRA: LegendaryMeta = {
  uniqueData: 'L_Moira Brown', name: 'Moira', lastName: 'Brown', gender: 1,
  special: [1, 2, 3, 4, 5, 6, 7], outfitId: 'HandymanJumpsuit_Expert',
  weaponId: '', skinColor: 0xffffffff, hairColor: 0xff000000, hair: '22', faceMask: null,
};

describe('createLegendaryDweller', () => {
  it('writes rarity, uniqueData, name, gender, outfit and faceMask', () => {
    const d = createLegendaryDweller(JERICHO, [], 30) as any;
    expect(d.rarity).toBe('Legendary');
    expect(d.uniqueData).toBe('L_Jericho');
    expect(d.name).toBe('Jericho');
    expect(d.gender).toBe(2);
    expect(d.equipedOutfit.id).toBe('WandererArmor_Heavy');
    expect(d.equipedWeapon.id).toBe('AssaultRifle_Infiltrator');
    expect(d.faceMask).toBe('f_hair_11');
  });

  it('maps SPECIAL into the 8-slot stats array (slot 0 is a placeholder)', () => {
    const d = createLegendaryDweller(JERICHO, [], 30) as any;
    expect(d.stats.stats).toHaveLength(8);
    expect(d.stats.stats.slice(1).map((s: any) => s.value)).toEqual([8, 6, 8, 2, 3, 7, 6]);
  });

  it('sets the requested level and matching health (105 + (level-1)*6)', () => {
    const d = createLegendaryDweller(JERICHO, [], 31) as any;
    expect(d.experience.currentLevel).toBe(31);
    expect(d.health.maxHealth).toBe(285);
    expect(d.health.healthValue).toBe(285);
  });

  it('falls back to Fist when the roster weapon is empty', () => {
    const d = createLegendaryDweller(MOIRA, [], 20) as any;
    expect(d.equipedWeapon.id).toBe('Fist');
  });

  it('omits hair when the roster entry has none, sets it otherwise', () => {
    expect((createLegendaryDweller(JERICHO, [], 20) as any).hair).toBeUndefined();
    expect((createLegendaryDweller(MOIRA, [], 20) as any).hair).toBe('22');
  });

  it('picks the smallest free serializeId', () => {
    expect((createLegendaryDweller(JERICHO, [1, 2, 4], 20) as any).serializeId).toBe(3);
  });

  it('defaults to a random level within [MIN, MAX] when none is given', () => {
    const lvl = (createLegendaryDweller(JERICHO, []) as any).experience.currentLevel;
    expect(lvl).toBeGreaterThanOrEqual(LEGENDARY_MIN_LEVEL);
    expect(lvl).toBeLessThanOrEqual(LEGENDARY_MAX_LEVEL);
  });
});
