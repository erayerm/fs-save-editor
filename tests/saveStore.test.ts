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
});
