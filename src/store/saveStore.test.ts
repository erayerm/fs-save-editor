import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore } from './saveStore';
import { decodeArgb } from '../lib/colors';
import type { SaveJson } from '../types/save';

function mkSave(): SaveJson {
  return {
    dwellers: {
      dwellers: [
        { serializeId: 1, name: 'A', lastName: 'X', gender: 1, hair: '5' },
        { serializeId: 2, name: 'B', lastName: 'Y', gender: 2, hair: '9' },
      ],
    },
  } as unknown as SaveJson;
}

describe('saveStore.updateSelectedDweller', () => {
  beforeEach(() => useSaveStore.getState().clear());

  it('patches only the selected dweller, leaving others untouched', () => {
    useSaveStore.getState().setSave(mkSave(), 'Vault1.sav');
    useSaveStore.getState().selectDweller(1);
    useSaveStore.getState().updateSelectedDweller({ hair: '21' });

    const ds = useSaveStore.getState().save!.dwellers.dwellers as any[];
    expect(ds.find((d) => d.serializeId === 1).hair).toBe('21');
    expect(ds.find((d) => d.serializeId === 2).hair).toBe('9');
  });

  it('encodes a color patch into the dweller', () => {
    useSaveStore.getState().setSave(mkSave(), 'Vault1.sav');
    useSaveStore.getState().selectDweller(1);
    useSaveStore.getState().updateSelectedDweller({ hairColor: { r: 1, g: 2, b: 3, a: 255 } });

    const d = useSaveStore.getState().getSelectedDweller() as any;
    expect(decodeArgb(d.hairColor)).toEqual({ r: 1, g: 2, b: 3, a: 255 });
  });

  it('is a no-op when no dweller is selected', () => {
    useSaveStore.getState().setSave(mkSave(), 'Vault1.sav');
    useSaveStore.getState().updateSelectedDweller({ hair: '21' });
    const ds = useSaveStore.getState().save!.dwellers.dwellers as any[];
    expect(ds[0].hair).toBe('5');
  });
});
