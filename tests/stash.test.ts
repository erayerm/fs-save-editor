import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStashItems, addStashItems, removeStashItemAt, removeStashItemsAt, replacedGear, groupStash,
  sortStashGroups, stashCapacity, canStash,
} from '../src/lib/stash';
import { useSaveStore } from '../src/store/saveStore';
import { setWeapon } from '../src/lib/dwellerEdit';

const ref = (id: string, type: string, extra: Record<string, unknown> = {}) =>
  ({ id, type, hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false, ...extra });

const dweller = (weapon: string, outfit: string) => ({
  serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2,
  equipedWeapon: ref(weapon, 'Weapon'),
  equipedOutfit: ref(outfit, 'Outfit'),
}) as any;

const saveWith = (d: any, items: any[] = [], rooms: any[] = []) => ({
  dwellers: { dwellers: [d] },
  vault: { storage: { resources: { Nuka: 1 } }, inventory: { items }, rooms },
}) as any;

const junk = (n: number) => Array.from({ length: n }, () => ref('Shovel', 'Junk'));

describe('stash helpers', () => {
  it('reads an absent inventory as empty', () => {
    expect(getStashItems({ dwellers: { dwellers: [] } } as any)).toEqual([]);
  });

  it('adds and removes items immutably', () => {
    const s = saveWith(dweller('Fist', 'jumpsuit'), [ref('Shovel', 'Junk')]);
    const added = addStashItems(s, [ref('LabCoat', 'Outfit'), ref('Yarn', 'Junk')]);
    expect(getStashItems(added).map((i) => i.id)).toEqual(['Shovel', 'LabCoat', 'Yarn']);
    expect(getStashItems(s)).toHaveLength(1);
    expect(getStashItems(removeStashItemAt(added, 0)).map((i) => i.id)).toEqual(['LabCoat', 'Yarn']);
    expect(getStashItems(removeStashItemsAt(added, [0, 2])).map((i) => i.id)).toEqual(['LabCoat']);
    expect(removeStashItemAt(added, 9)).toBe(added);
  });

  it('replacedGear returns swapped non-default weapon and outfit', () => {
    const before = dweller('Minigun', 'LabCoat');
    const after = dweller('Fatman', 'SwingDress');
    expect(replacedGear(before, after).map((i) => i.id)).toEqual(['Minigun', 'LabCoat']);
  });

  it('replacedGear ignores the default Fist and jumpsuit and unchanged slots', () => {
    expect(replacedGear(dweller('Fist', 'jumpsuit'), dweller('Minigun', 'LabCoat'))).toEqual([]);
    expect(replacedGear(dweller('Minigun', 'LabCoat'), dweller('Minigun', 'LabCoat'))).toEqual([]);
  });

  it('groupStash groups identical entries but keeps pets with different extraData apart', () => {
    const items = [
      ref('Shovel', 'Junk'), ref('Shovel', 'Junk'),
      ref('cat_l', 'Pet', { extraData: { uniqueName: 'A' } }),
      ref('cat_l', 'Pet', { extraData: { uniqueName: 'B' } }),
    ];
    expect(groupStash(items).map((g) => g.indices)).toEqual([[0, 1], [2], [3]]);
  });

  it('sortStashGroups orders by type by default, and by name or quantity on request', () => {
    const groups = groupStash([
      ref('Yarn', 'Junk'), ref('LabCoat', 'Outfit'), ref('Yarn', 'Junk'), ref('Minigun', 'Weapon'),
    ]);
    const ids = (sort: any) => sortStashGroups(groups, sort, (g) => g.item.id).map((g) => g.item.id);
    expect(ids('default')).toEqual(['Minigun', 'LabCoat', 'Yarn']);
    expect(ids('name-asc')).toEqual(['LabCoat', 'Minigun', 'Yarn']);
    expect(ids('name-desc')).toEqual(['Yarn', 'Minigun', 'LabCoat']);
    expect(ids('count-desc')[0]).toBe('Yarn');
    expect(ids('count-asc')[2]).toBe('Yarn');
  });
});

describe('stash capacity', () => {
  it('is 10 with no storage rooms', () => {
    expect(stashCapacity(saveWith(dweller('Fist', 'jumpsuit')))).toBe(10);
  });

  it('adds each Storage room by level and merged width', () => {
    const rooms = [
      { type: 'Storage', level: 3, mergeLevel: 3 },
      { type: 'Storage', level: 1, mergeLevel: 1 },
      { type: 'Storage', level: 2, mergeLevel: 2 },
      { type: 'Cafeteria', level: 3, mergeLevel: 3 },
    ];
    expect(stashCapacity(saveWith(dweller('Fist', 'jumpsuit'), [], rooms))).toBe(10 + 125 + 10 + 35);
  });

  it('canStash checks free slots', () => {
    const s = saveWith(dweller('Fist', 'jumpsuit'), junk(9));
    expect(canStash(s)).toBe(true);
    expect(canStash(s, 2)).toBe(false);
  });
});

describe('store swapSelectedGear', () => {
  beforeEach(() => useSaveStore.getState().clear());

  it('plain dweller edits never touch the stash', () => {
    useSaveStore.getState().setSave(saveWith(dweller('Minigun', 'LabCoat')), 'x.sav');
    useSaveStore.getState().updateSelectedDwellerRaw((d) => setWeapon(d, 'Fatman'));
    useSaveStore.getState().updateSelectedDweller({ outfitId: 'SwingDress' });
    expect(getStashItems(useSaveStore.getState().save!)).toEqual([]);
  });

  it('stash: true moves the replaced item to the stash', () => {
    useSaveStore.getState().setSave(saveWith(dweller('Minigun_LeadBelcher', 'jumpsuit')), 'x.sav');
    useSaveStore.getState().swapSelectedGear((d) => setWeapon(d, 'Fatman'), true);
    const s = useSaveStore.getState().save!;
    expect(s.dwellers.dwellers[0].equipedWeapon!.id).toBe('Fatman');
    expect(getStashItems(s)).toEqual([ref('Minigun_LeadBelcher', 'Weapon')]);
  });

  it('stash: false discards the replaced item', () => {
    useSaveStore.getState().setSave(saveWith(dweller('Minigun', 'jumpsuit')), 'x.sav');
    useSaveStore.getState().swapSelectedGear((d) => setWeapon(d, 'Fatman'), false);
    const s = useSaveStore.getState().save!;
    expect(s.dwellers.dwellers[0].equipedWeapon!.id).toBe('Fatman');
    expect(getStashItems(s)).toEqual([]);
  });

  it('stash: true is a no-op when the stash is full', () => {
    useSaveStore.getState().setSave(saveWith(dweller('Minigun', 'jumpsuit'), junk(10)), 'x.sav');
    const before = useSaveStore.getState().save;
    useSaveStore.getState().swapSelectedGear((d) => setWeapon(d, 'Fatman'), true);
    expect(useSaveStore.getState().save).toBe(before);
  });

  it('discarding still works when the stash is over capacity', () => {
    useSaveStore.getState().setSave(saveWith(dweller('Minigun', 'jumpsuit'), junk(12)), 'x.sav');
    useSaveStore.getState().swapSelectedGear((d) => setWeapon(d, 'Fatman'), false);
    expect(useSaveStore.getState().save!.dwellers.dwellers[0].equipedWeapon!.id).toBe('Fatman');
  });
});
