import { create } from 'zustand';
import type { SaveJson, Dweller } from '../types/save';

interface SaveState {
  save: SaveJson | null;
  selectedDwellerId: number | null;
  fileName: string | null;
  setSave: (save: SaveJson, fileName: string) => void;
  selectDweller: (id: number | null) => void;
  getSelectedDweller: () => Dweller | null;
  clear: () => void;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  save: null,
  selectedDwellerId: null,
  fileName: null,
  setSave: (save, fileName) => set({ save, fileName, selectedDwellerId: null }),
  selectDweller: (id) => set({ selectedDwellerId: id }),
  getSelectedDweller: () => {
    const { save, selectedDwellerId } = get();
    if (!save || selectedDwellerId === null) return null;
    return save.dwellers.dwellers.find((d) => d.serializeId === selectedDwellerId) ?? null;
  },
  clear: () => set({ save: null, selectedDwellerId: null, fileName: null }),
}));
