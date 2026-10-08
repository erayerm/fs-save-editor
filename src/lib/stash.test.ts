import { describe, it, expect } from 'vitest';
import { equipFromStash, getStashItems, replacedGear } from './stash';
import type { Dweller, EquipRef, SaveJson } from '../types/save';

const weapon = (id: string): EquipRef => ({ id, type: 'Weapon', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false });
const outfit = (id: string): EquipRef => ({ id, type: 'Outfit', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false });
const pet = (id: string, uniqueName: string): EquipRef => ({
  id, type: 'Pet', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false,
  extraData: { uniqueName, bonus: 'XPBoost', bonusValue: 10 },
});

function makeSave(dweller: Partial<Dweller>, items: EquipRef[]): SaveJson {
  return {
    dwellers: { dwellers: [{ serializeId: 1, ...dweller } as Dweller, { serializeId: 2 } as Dweller] },
    vault: { inventory: { items } },
  } as unknown as SaveJson;
}

const dweller = (s: SaveJson, id = 1) => s.dwellers.dwellers.find((d) => d.serializeId === id)!;

describe('equipFromStash', () => {
  it('swaps the equipped weapon into the stash slot it came from', () => {
    const s = makeSave({ equipedWeapon: weapon('Shotgun_Rusty') }, [outfit('Lab'), weapon('Minigun_LeadBelcher')]);
    const next = equipFromStash(s, 1, 1);
    expect(dweller(next).equipedWeapon?.id).toBe('Minigun_LeadBelcher');
    expect(getStashItems(next).map((i) => i.id)).toEqual(['Lab', 'Shotgun_Rusty']);
  });

  it('removes the item from the stash when replacing the default Fist', () => {
    const s = makeSave({ equipedWeapon: weapon('Fist') }, [weapon('Minigun_LeadBelcher')]);
    const next = equipFromStash(s, 1, 0);
    expect(dweller(next).equipedWeapon?.id).toBe('Minigun_LeadBelcher');
    expect(getStashItems(next)).toEqual([]);
  });

  it('equips outfits into the outfit slot, dropping the default jumpsuit', () => {
    const s = makeSave(
      { equipedOutfit: outfit('jumpsuit'), equipedWeapon: weapon('Fist') },
      [outfit('RadiationSuit_Expert')],
    );
    const next = equipFromStash(s, 1, 0);
    expect(dweller(next).equipedOutfit?.id).toBe('RadiationSuit_Expert');
    expect(dweller(next).equipedWeapon?.id).toBe('Fist');
    expect(getStashItems(next)).toEqual([]);
  });

  it('leaves other dwellers untouched', () => {
    const s = makeSave({ equipedWeapon: weapon('Fist') }, [weapon('Minigun_LeadBelcher')]);
    expect(dweller(equipFromStash(s, 1, 0), 2)).toBe(dweller(s, 2));
  });

  it('swaps pets, keeping each pet\'s name and bonus', () => {
    const s = makeSave({ equippedPet: pet('stbernard_l', 'Barry') }, [pet('akita_l', 'Kuma')]);
    const next = equipFromStash(s, 1, 0);
    expect(dweller(next).equippedPet).toEqual(pet('akita_l', 'Kuma'));
    expect(getStashItems(next)).toEqual([pet('stbernard_l', 'Barry')]);
  });

  it('removes the pet from the stash when the dweller had none', () => {
    const s = makeSave({}, [pet('akita_l', 'Kuma')]);
    const next = equipFromStash(s, 1, 0);
    expect(dweller(next).equippedPet).toEqual(pet('akita_l', 'Kuma'));
    expect(getStashItems(next)).toEqual([]);
  });

  it('is a no-op for junk, bad indices and unknown dwellers', () => {
    const s = makeSave({}, [{ id: 'Gear', type: 'Junk' }, weapon('Minigun_LeadBelcher')]);
    expect(equipFromStash(s, 1, 0)).toBe(s);
    expect(equipFromStash(s, 1, 9)).toBe(s);
    expect(equipFromStash(s, 99, 1)).toBe(s);
  });
});

describe('replacedGear', () => {
  it('reports a removed or replaced pet', () => {
    const before = { equippedPet: pet('stbernard_l', 'Barry') } as unknown as Dweller;
    expect(replacedGear(before, {} as Dweller)).toEqual([pet('stbernard_l', 'Barry')]);
    expect(replacedGear(before, { equippedPet: pet('akita_l', 'Kuma') } as unknown as Dweller))
      .toEqual([pet('stbernard_l', 'Barry')]);
  });

  it('treats the same breed with a different name or bonus as a different pet', () => {
    const before = { equippedPet: pet('stbernard_l', 'Barry') } as unknown as Dweller;
    const after = { equippedPet: pet('stbernard_l', 'Rex') } as unknown as Dweller;
    expect(replacedGear(before, after)).toEqual([pet('stbernard_l', 'Barry')]);
    expect(replacedGear(before, before)).toEqual([]);
  });
});
