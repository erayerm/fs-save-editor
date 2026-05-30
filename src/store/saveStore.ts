import { create } from 'zustand';
import type { SaveJson, Dweller } from '../types/save';
import { applyCustomization, type DwellerCustomization } from '../lib/dwellerEdit';

interface SaveState {
  save: SaveJson | null;
  selectedDwellerId: number | null;
  fileName: string | null;
  setSave: (save: SaveJson, fileName: string) => void;
  selectDweller: (id: number | null) => void;
  getSelectedDweller: () => Dweller | null;
  updateSelectedDweller: (patch: DwellerCustomization) => void;
  updateSelectedDwellerRaw: (fn: (d: Dweller) => Dweller) => void;
  setVault: (fn: (s: SaveJson) => SaveJson) => void;
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
  updateSelectedDweller: (patch) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save || selectedDwellerId === null) return {};
    const dwellers = save.dwellers.dwellers.map((d) =>
      d.serializeId === selectedDwellerId ? applyCustomization(d, patch) : d,
    );
    return { save: { ...save, dwellers: { ...save.dwellers, dwellers } } };
  }),
  updateSelectedDwellerRaw: (fn) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save || selectedDwellerId === null) return {};
    const dwellers = save.dwellers.dwellers.map((d) =>
      d.serializeId === selectedDwellerId ? fn(d) : d,
    );
    return { save: { ...save, dwellers: { ...save.dwellers, dwellers } } };
  }),
  setVault: (fn) => set((state) => (state.save ? { save: fn(state.save) } : {})),
  clear: () => set({ save: null, selectedDwellerId: null, fileName: null }),
}));
