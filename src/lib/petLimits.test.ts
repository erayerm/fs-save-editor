import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_VAULT_PETS, VAULT_PETS_FULL, petLimitError, roomPetCapacity, roomPetCount, roomPetError, vaultPetCount,
} from './petLimits';
import { useSaveStore } from '../store/saveStore';
import { getStashItems } from './stash';
import type { Dweller, EquipRef, SaveJson } from '../types/save';

const pet = (id = 'germanshepherd_c'): EquipRef => ({
  id, type: 'Pet', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false,
  extraData: { uniqueName: 'Rex', bonus: 'XPBoost', bonusValue: 10 },
});

const dweller = (serializeId: number, withPet = false) =>
  ({ serializeId, ...(withPet ? { equippedPet: pet() } : {}) }) as unknown as Dweller;

/** One room of `mergeLevel` holding dwellers 1..`count`; the first `pets` of them carry a pet. */
function makeSave(mergeLevel: number, count: number, pets: number, stashPets = 0): SaveJson {
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  return {
    dwellers: { dwellers: ids.map((id) => dweller(id, id <= pets)) },
    vault: {
      rooms: [{ type: 'LivingQuarters', mergeLevel, dwellers: ids }],
      inventory: { items: Array.from({ length: stashPets }, () => pet()) },
    },
  } as unknown as SaveJson;
}

const givePet = (s: SaveJson, id: number): SaveJson => ({
  ...s,
  dwellers: {
    ...s.dwellers,
    dwellers: s.dwellers.dwellers.map((d) => (d.serializeId === id ? { ...d, equippedPet: pet() } : d)),
  },
});

const room = (s: SaveJson) => (s.vault as any).rooms[0];

describe('roomPetCapacity', () => {
  it('allows 1 / 2 / 3 pets in single / double / triple rooms', () => {
    expect(roomPetCapacity({ type: 'Gym', mergeLevel: 1 })).toBe(1);
    expect(roomPetCapacity({ type: 'Gym', mergeLevel: 2 })).toBe(2);
    expect(roomPetCapacity({ type: 'Gym', mergeLevel: 3 })).toBe(3);
    expect(roomPetCapacity({ type: 'Gym' })).toBe(1);
  });
});

describe('pet counts', () => {
  it('counts equipped and stashed pets toward the vault total', () => {
    expect(vaultPetCount(makeSave(3, 3, 2, 4))).toBe(6);
  });

  it('counts only pets of the dwellers assigned to the room', () => {
    const s = makeSave(3, 3, 2);
    expect(roomPetCount(s, room(s))).toBe(2);
  });
});

describe('roomPetError', () => {
  it('blocks a dweller without a pet in a full room', () => {
    const s = makeSave(2, 3, 2);
    expect(roomPetError(s, 3)).toMatch(/double room and holds at most 2 pets/);
  });

  it('allows a dweller with free room space, or one that already has a pet', () => {
    expect(roomPetError(makeSave(3, 3, 2), 3)).toBeNull();
    expect(roomPetError(makeSave(1, 2, 1), 1)).toBeNull();
  });

  it('never blocks dwellers outside any room', () => {
    const s = makeSave(1, 1, 1);
    const withDoorDweller = { ...s, dwellers: { dwellers: [...s.dwellers.dwellers, dweller(9)] } };
    expect(roomPetError(withDoorDweller, 9)).toBeNull();
  });
});

describe('petLimitError', () => {
  it('rejects a pet that overfills a room', () => {
    const s = makeSave(1, 2, 1);
    expect(petLimitError(s, givePet(s, 2))).toMatch(/single room and holds at most 1 pet\./);
  });

  it('accepts a pet that fits the room', () => {
    const s = makeSave(2, 2, 1);
    expect(petLimitError(s, givePet(s, 2))).toBeNull();
  });

  it('rejects growing the vault past the pet limit', () => {
    const s = makeSave(3, 3, 0, MAX_VAULT_PETS);
    expect(petLimitError(s, givePet(s, 1))).toBe(VAULT_PETS_FULL);
  });

  it('allows edits to a save already over a limit as long as they do not add to it', () => {
    const s = makeSave(1, 3, 3, MAX_VAULT_PETS);
    expect(petLimitError(s, s)).toBeNull();
  });
});

describe('saveStore pet limit guard', () => {
  beforeEach(() => useSaveStore.getState().clear());

  it('ignores giving a pet to a dweller in a full room', () => {
    const s = makeSave(1, 2, 1);
    useSaveStore.setState({ save: s, selectedDwellerId: 2 });
    useSaveStore.getState().updateSelectedDwellerRaw((d) => ({ ...d, equippedPet: pet() }));
    expect(useSaveStore.getState().save).toBe(s);
  });

  it('ignores equipping a stashed pet into a full room', () => {
    const s = makeSave(1, 2, 1, 1);
    useSaveStore.setState({ save: s, selectedDwellerId: 2 });
    useSaveStore.getState().equipSelectedFromStash(0);
    expect(useSaveStore.getState().save).toBe(s);
  });

  it('ignores adding a pet to the stash of a vault at the limit', () => {
    const s = makeSave(3, 3, 0, MAX_VAULT_PETS);
    useSaveStore.setState({ save: s });
    useSaveStore.getState().setVault((v) => ({
      ...v, vault: { ...v.vault, inventory: { items: [...getStashItems(v), pet()] } },
    }));
    expect(useSaveStore.getState().save).toBe(s);
  });

  it('still allows stash swaps that keep the vault total unchanged', () => {
    const s = makeSave(1, 1, 1, 1);
    useSaveStore.setState({ save: s, selectedDwellerId: 1 });
    useSaveStore.getState().equipSelectedFromStash(0);
    expect(useSaveStore.getState().save).not.toBe(s);
  });
});
