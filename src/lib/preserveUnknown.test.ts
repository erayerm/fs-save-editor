import { describe, it, expect } from 'vitest';
import { encodeSav, decodeSav } from './savFile';
import { applyCustomization, setLevel, setName, setStat, setGender, setPregnancy } from './dwellerEdit';
import type { Dweller, SaveJson } from '../types/save';

// A dweller carrying content the editor's catalogs don't know about (a future
// game update: new outfit/weapon/pet/hair ids), plus an arbitrary unknown
// top-level key. The editor must NEVER silently rewrite or drop any of this —
// the save is the source of truth; our catalogs only drive display.
function unknownDweller(): Dweller {
  return {
    serializeId: 7,
    name: 'New',
    lastName: 'Content',
    gender: 2,
    experience: { currentLevel: 12, experienceValue: 0 },
    stats: { stats: Array.from({ length: 8 }, () => ({ value: 3, mod: 0, exp: 0 })) },
    hair: 'UNKNOWN_HAIR_2099',
    faceMask: 'UNKNOWN_BEARD_2099',
    equipedOutfit: { id: 'UNKNOWN_OUTFIT_2099', type: 'Outfit', hasBeenAssigned: true },
    equipedWeapon: { id: 'UNKNOWN_WEAPON_2099', type: 'Weapon', hasBeenAssigned: true },
    equippedPet: {
      id: 'unknown_pet_2099',
      type: 'Pet',
      extraData: { uniqueName: 'Mittens', bonus: 'BrandNewBonus', bonusValue: 9 },
    },
    futureField_xyz: { something: 'the game added this in a later update' },
  } as unknown as Dweller;
}

function saveWith(d: Dweller): SaveJson {
  return { dwellers: { dwellers: [d] } } as unknown as SaveJson;
}

// The fields a future update might introduce that we must preserve verbatim.
const itemFields = (d: unknown) => {
  const x = d as Record<string, any>;
  return {
    hair: x.hair,
    faceMask: x.faceMask,
    outfit: x.equipedOutfit?.id,
    weapon: x.equipedWeapon?.id,
    pet: x.equippedPet?.id,
    petExtra: x.equippedPet?.extraData,
    future: x.futureField_xyz,
  };
};

describe('unknown content is preserved (no data loss on future game updates)', () => {
  it('survives a full encrypt → decrypt round-trip unchanged', async () => {
    const save = saveWith(unknownDweller());
    const round = await decodeSav(await encodeSav(save));
    expect(round).toEqual(save);
  });

  it.each([
    ['setLevel', (d: Dweller) => setLevel(d, 30)],
    ['setName', (d: Dweller) => setName(d, { name: 'Renamed' })],
    ['setStat', (d: Dweller) => setStat(d, 'S', 9)],
    ['setGender', (d: Dweller) => setGender(d, 1)],
    ['setPregnancy', (d: Dweller) => setPregnancy(d, { pregnant: true })],
    ['applyCustomization(skinColor)', (d: Dweller) => applyCustomization(d, { skinColor: { r: 1, g: 2, b: 3 } })],
  ])('editing an unrelated field via %s keeps every unknown item intact', (_label, edit) => {
    const before = unknownDweller();
    const after = edit(before);
    expect(itemFields(after)).toEqual(itemFields(before));
  });

  it('changing the outfit touches only equipedOutfit.id — weapon/pet/hair/extra fields stay', () => {
    const before = unknownDweller();
    const after = applyCustomization(before, { outfitId: 'jumpsuit' }) as Record<string, any>;
    expect(after.equipedOutfit.id).toBe('jumpsuit');
    expect(after.equipedWeapon.id).toBe('UNKNOWN_WEAPON_2099');
    expect(after.equippedPet.id).toBe('unknown_pet_2099');
    expect(after.hair).toBe('UNKNOWN_HAIR_2099');
    expect(after.faceMask).toBe('UNKNOWN_BEARD_2099');
    expect(after.futureField_xyz).toEqual({ something: 'the game added this in a later update' });
  });
});
