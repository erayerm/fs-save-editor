import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore } from '../src/store/saveStore';
import { setStat } from '../src/lib/dwellerEdit';
import { setCaps, getCaps } from '../src/lib/vaultEdit';

const sampleSave = () => ({
  dwellers: {
    dwellers: [
      {
        serializeId: 1,
        name: 'Bob',
        lastName: 'Cox',
        gender: 2,
        stats: { stats: Array.from({ length: 8 }, () => ({ value: 1, mod: 0, exp: 0 })) },
        someUnknownKey: 'preserved',
      },
    ],
  },
  vault: { storage: { resources: { Nuka: 100 } }, LunchBoxesCount: 0 },
} as any);

describe('saveStore raw/vault actions', () => {
  beforeEach(() => {
    useSaveStore.getState().clear();
  });

  it('updateSelectedDwellerRaw applies a pure editor and round-trips unknown keys', () => {
    const store = useSaveStore.getState();
    const s = sampleSave();
    store.setSave(s, 'x.sav');
    store.selectDweller(s.dwellers.dwellers[0].serializeId);
    store.updateSelectedDwellerRaw((d) => setStat(d, 'S', 7));
    const d = useSaveStore.getState().getSelectedDweller()!;
    expect(d.stats!.stats[1].value).toBe(7);
    expect((d as any).someUnknownKey).toBe('preserved');
  });

  it('setVault replaces the whole save with the edited vault', () => {
    const store = useSaveStore.getState();
    store.setSave(sampleSave(), 'x.sav');
    store.setVault((sv) => setCaps(sv, 500));
    expect(getCaps(useSaveStore.getState().save!)).toBe(500);
  });

  it('removeDweller evicts the dweller and re-selects the first remaining one', () => {
    const store = useSaveStore.getState();
    const s = sampleSave();
    s.dwellers.dwellers.push({ serializeId: 2, name: 'Eve', lastName: 'Snow', gender: 1 });
    store.setSave(s, 'x.sav');
    store.selectDweller(1);
    store.removeDweller(1);
    const st = useSaveStore.getState();
    expect(st.save!.dwellers.dwellers.map((d) => d.serializeId)).toEqual([2]);
    expect(st.selectedDwellerId).toBe(2);
  });

  it('removeDweller sets selection to null when the last dweller is evicted', () => {
    const store = useSaveStore.getState();
    store.setSave(sampleSave(), 'x.sav');
    store.selectDweller(1);
    store.removeDweller(1);
    const st = useSaveStore.getState();
    expect(st.save!.dwellers.dwellers).toHaveLength(0);
    expect(st.selectedDwellerId).toBeNull();
  });

  it('removeDweller also removes the dweller from its room', () => {
    const store = useSaveStore.getState();
    const s = { ...sampleSave(), vault: { rooms: [{ type: 'Cafeteria', dwellers: [1, 7] }] } };
    store.setSave(s, 'x.sav');
    store.removeDweller(1);
    const rooms = (useSaveStore.getState().save!.vault as any).rooms;
    expect(rooms[0].dwellers).toEqual([7]);
  });

  const geared = () => {
    const s = sampleSave();
    Object.assign(s.dwellers.dwellers[0], {
      equipedWeapon: { id: 'Shotgun', type: 'Weapon' },
      equipedOutfit: { id: 'jumpsuit', type: 'Outfit' },
      equippedPet: { id: 'akita_l', type: 'Pet', extraData: { uniqueName: 'Kuma' } },
    });
    return s;
  };
  const stashIds = () =>
    ((useSaveStore.getState().save!.vault as any).inventory?.items ?? []).map((it: any) => it.id);

  it('removeDweller with stashGear moves non-default gear to the stash', () => {
    useSaveStore.getState().setSave(geared(), 'x.sav');
    useSaveStore.getState().removeDweller(1, { stashGear: true });
    expect(useSaveStore.getState().save!.dwellers.dwellers).toHaveLength(0);
    expect(stashIds()).toEqual(['Shotgun', 'akita_l']);
  });

  it('removeDweller without stashGear discards the gear', () => {
    useSaveStore.getState().setSave(geared(), 'x.sav');
    useSaveStore.getState().removeDweller(1);
    expect(useSaveStore.getState().save!.dwellers.dwellers).toHaveLength(0);
    expect(stashIds()).toEqual([]);
  });

  it('removeDweller with stashGear does nothing when the gear does not fit', () => {
    const s = geared();
    s.vault.inventory = { items: Array.from({ length: 9 }, () => ({ id: 'Junk1', type: 'Junk' })) };
    useSaveStore.getState().setSave(s, 'x.sav');
    useSaveStore.getState().removeDweller(1, { stashGear: true });
    expect(useSaveStore.getState().save!.dwellers.dwellers).toHaveLength(1);
    expect(stashIds()).toHaveLength(9);
  });
});
