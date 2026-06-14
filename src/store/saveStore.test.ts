import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore } from './saveStore';
import type { SaveJson } from '../types/save';
import type { LegendaryMeta } from '../types/legendary';

const fakeSave = { dwellers: { dwellers: [] } } as unknown as SaveJson;

describe('saveStore isDemo flag', () => {
  beforeEach(() => {
    useSaveStore.getState().clear();
  });

  it('defaults to false', () => {
    expect(useSaveStore.getState().isDemo).toBe(false);
  });

  it('is false after a normal setSave', () => {
    useSaveStore.getState().setSave(fakeSave, 'Vault1.sav');
    expect(useSaveStore.getState().isDemo).toBe(false);
  });

  it('is true when setSave is called with isDemo', () => {
    useSaveStore.getState().setSave(fakeSave, 'demo.sav', { isDemo: true });
    expect(useSaveStore.getState().isDemo).toBe(true);
  });

  it('resets to false on clear', () => {
    useSaveStore.getState().setSave(fakeSave, 'demo.sav', { isDemo: true });
    useSaveStore.getState().clear();
    expect(useSaveStore.getState().isDemo).toBe(false);
  });
});

const LEG_ENTRY: LegendaryMeta = {
  uniqueData: 'L_Jericho', name: 'Jericho', lastName: '', gender: 2,
  special: [8, 6, 8, 2, 3, 7, 6], outfitId: 'WandererArmor_Heavy',
  weaponId: 'AssaultRifle_Infiltrator', skinColor: 0xffe9d4b4, hairColor: 0xff695949,
  hair: null, faceMask: 'f_hair_11',
};

describe('addLegendaryDweller', () => {
  it('appends a legendary, selects it, and switches to the dweller page', () => {
    useSaveStore.setState({
      save: { dwellers: { dwellers: [{ serializeId: 1 } as any] } } as any,
      selectedDwellerId: 1,
    });
    const id = useSaveStore.getState().addLegendaryDweller(LEG_ENTRY);
    const s = useSaveStore.getState();
    const added = s.save!.dwellers.dwellers.find((d) => d.serializeId === id) as any;
    expect(added.rarity).toBe('Legendary');
    expect(added.uniqueData).toBe('L_Jericho');
    expect(s.selectedDwellerId).toBe(id);
    expect(s.page).toBe('dweller');
  });

  it('returns null when there is no save', () => {
    useSaveStore.setState({ save: null, selectedDwellerId: null });
    expect(useSaveStore.getState().addLegendaryDweller(LEG_ENTRY)).toBeNull();
  });
});
