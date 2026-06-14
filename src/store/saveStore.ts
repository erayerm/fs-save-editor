import { create } from 'zustand';
import type { SaveJson, Dweller } from '../types/save';
import { applyCustomization, createDwellerAtDoor, createLegendaryDweller, type DwellerCustomization, type NewDwellerInput } from '../lib/dwellerEdit';
import type { LegendaryMeta } from '../types/legendary';
import { registerLegendaryDiscovery } from '../lib/survivalGuide';

export type Page = 'vault' | 'dweller';

interface SaveState {
  save: SaveJson | null;
  selectedDwellerId: number | null;
  fileName: string | null;
  page: Page;
  /** True when the loaded save is the bundled demo file. */
  isDemo: boolean;
  setSave: (save: SaveJson, fileName: string, opts?: { isDemo?: boolean }) => void;
  /** Switch the top-level page. Navigating to 'dweller' selects the first dweller if none is selected. */
  setPage: (page: Page) => void;
  selectDweller: (id: number | null) => void;
  getSelectedDweller: () => Dweller | null;
  updateSelectedDweller: (patch: DwellerCustomization) => void;
  updateSelectedDwellerRaw: (fn: (d: Dweller) => Dweller) => void;
  setVault: (fn: (s: SaveJson) => SaveJson) => void;
  /** Add a fresh dweller at the vault door; returns the new dweller's id (or null if no save). */
  addDweller: (input: NewDwellerInput) => number | null;
  /** Add a legendary dweller from a roster entry; returns the new id (or null if no save). */
  addLegendaryDweller: (entry: LegendaryMeta) => number | null;
  /** Evict (permanently remove) a dweller. If it was selected, selection moves to the first remaining dweller. */
  removeDweller: (id: number) => void;
  clear: () => void;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  save: null,
  selectedDwellerId: null,
  fileName: null,
  page: 'vault',
  isDemo: false,
  setSave: (save, fileName, opts) =>
    set({ save, fileName, selectedDwellerId: null, page: 'vault', isDemo: opts?.isDemo ?? false }),
  setPage: (page) => set((state) => {
    if (page === 'dweller' && state.selectedDwellerId === null) {
      const first = state.save?.dwellers.dwellers[0]?.serializeId ?? null;
      return { page, selectedDwellerId: first };
    }
    return { page };
  }),
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
  addDweller: (input) => {
    const { save } = get();
    if (!save) return null;
    const existing = save.dwellers.dwellers;
    const dweller = createDwellerAtDoor(input, existing.map((d) => d.serializeId));
    set({
      save: { ...save, dwellers: { ...save.dwellers, dwellers: [...existing, dweller] } },
      selectedDwellerId: dweller.serializeId,
      page: 'dweller',
    });
    return dweller.serializeId;
  },
  addLegendaryDweller: (entry) => {
    const { save } = get();
    if (!save) return null;
    const existing = save.dwellers.dwellers;
    const dweller = createLegendaryDweller(entry, existing.map((d) => d.serializeId));
    // Also register the legendary in the Survival Guide collection (the in-game
    // "x/58" counter), which the game otherwise only populates on creation.
    const survivalW = (save.survivalW ?? {}) as Record<string, unknown>;
    const guideDwellers = Array.isArray(survivalW.dwellers) ? (survivalW.dwellers as string[]) : [];
    set({
      save: {
        ...save,
        dwellers: { ...save.dwellers, dwellers: [...existing, dweller] },
        survivalW: { ...survivalW, dwellers: registerLegendaryDiscovery(guideDwellers, entry.uniqueData) },
      },
      selectedDwellerId: dweller.serializeId,
      page: 'dweller',
    });
    return dweller.serializeId;
  },
  removeDweller: (id) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save) return {};
    const remaining = save.dwellers.dwellers.filter((d) => d.serializeId !== id);
    const nextSelected = selectedDwellerId === id
      ? (remaining[0]?.serializeId ?? null)
      : selectedDwellerId;
    return {
      save: { ...save, dwellers: { ...save.dwellers, dwellers: remaining } },
      selectedDwellerId: nextSelected,
    };
  }),
  clear: () => set({ save: null, selectedDwellerId: null, fileName: null, isDemo: false }),
}));
