import { create } from 'zustand';
import type { SaveJson, Dweller } from '../types/save';
import { applyCustomization, createDwellerAtDoor, createLegendaryDweller, type DwellerCustomization, type NewDwellerInput } from '../lib/dwellerEdit';
import type { LegendaryMeta } from '../types/legendary';
import { unassignDweller, ALL_ROOMS } from '../lib/rooms';
import { addStashItems, canStash, equipFromStash, equippedGear, replacedGear } from '../lib/stash';
import { petLimitError } from '../lib/petLimits';

export type Page = 'vault' | 'dweller';

/**
 * Apply `fn` to one dweller. With `stash`, any weapon or outfit the edit takes
 * off the dweller (other than the default Fist / jumpsuit) is added to the vault
 * stash; returns null when those items don't fit.
 */
export function editDweller(
  save: SaveJson, id: number, fn: (d: Dweller) => Dweller, stash = false,
): SaveJson | null {
  let removed: ReturnType<typeof replacedGear> = [];
  const dwellers = save.dwellers.dwellers.map((d) => {
    if (d.serializeId !== id) return d;
    const next = fn(d);
    if (stash) removed = replacedGear(d, next);
    return next;
  });
  if (removed.length > 0 && !canStash(save, removed.length)) return null;
  return addStashItems({ ...save, dwellers: { ...save.dwellers, dwellers } }, removed);
}

/** State update to `next`, or no change when it is null or breaks a pet limit. */
const commit = (save: SaveJson, next: SaveJson | null) =>
  next && !petLimitError(save, next) ? { save: next } : {};

interface SaveState {
  save: SaveJson | null;
  selectedDwellerId: number | null;
  fileName: string | null;
  page: Page;
  /** True when the loaded save is the bundled demo file. */
  isDemo: boolean;
  /** Room key (or ALL_ROOMS / UNASSIGNED) the dweller strip is filtered to. */
  roomFilter: string;
  /** Text narrowing the room badges in the dweller strip. */
  roomQuery: string;
  setRoomFilter: (key: string) => void;
  setRoomQuery: (query: string) => void;
  /** Filter the dweller strip to one room, clearing any room search that would hide it. */
  showRoom: (key: string) => void;
  setSave: (save: SaveJson, fileName: string, opts?: { isDemo?: boolean }) => void;
  /** Switch the top-level page. Navigating to 'dweller' selects the first dweller if none is selected. */
  setPage: (page: Page) => void;
  selectDweller: (id: number | null) => void;
  getSelectedDweller: () => Dweller | null;
  updateSelectedDweller: (patch: DwellerCustomization) => void;
  updateSelectedDwellerRaw: (fn: (d: Dweller) => Dweller) => void;
  /** Apply a raw edit to any dweller by id (e.g. renaming relatives in the family tree). */
  updateDwellerRaw: (id: number, fn: (d: Dweller) => Dweller) => void;
  /**
   * Apply a gear-changing edit to the selected dweller. With `stash`, the
   * weapon/outfit it removes goes to the vault stash (no-op if the stash is full);
   * otherwise it is discarded.
   */
  swapSelectedGear: (fn: (d: Dweller) => Dweller, stash: boolean) => void;
  /** Equip stash item `index` on the selected dweller; the item it replaces goes to the stash. */
  equipSelectedFromStash: (index: number) => void;
  setVault: (fn: (s: SaveJson) => SaveJson) => void;
  /** Add a fresh dweller at the vault door; returns the new dweller's id (or null if no save). */
  addDweller: (input: NewDwellerInput) => number | null;
  /** Add a legendary dweller from a roster entry; returns the new id (or null if no save). */
  addLegendaryDweller: (entry: LegendaryMeta) => number | null;
  /**
   * Evict (permanently remove) a dweller. If it was selected, selection moves to the
   * first remaining dweller. With `stashGear`, its equipped weapon, outfit and pet
   * go to the vault stash (no-op if they don't all fit); otherwise they're discarded.
   */
  removeDweller: (id: number, opts?: { stashGear?: boolean }) => void;
  clear: () => void;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  save: null,
  selectedDwellerId: null,
  fileName: null,
  page: 'vault',
  isDemo: false,
  roomFilter: ALL_ROOMS,
  roomQuery: '',
  setRoomFilter: (key) => set({ roomFilter: key }),
  setRoomQuery: (query) => set({ roomQuery: query }),
  showRoom: (key) => set({ roomFilter: key, roomQuery: '' }),
  setSave: (save, fileName, opts) =>
    set({
      save,
      fileName,
      roomFilter: ALL_ROOMS,
      roomQuery: '',
      // Open on the Dweller Settings tab with the first dweller selected.
      selectedDwellerId: save.dwellers.dwellers[0]?.serializeId ?? null,
      page: 'dweller',
      isDemo: opts?.isDemo ?? false,
    }),
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
    return { save: editDweller(save, selectedDwellerId, (d) => applyCustomization(d, patch))! };
  }),
  updateSelectedDwellerRaw: (fn) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save || selectedDwellerId === null) return {};
    return commit(save, editDweller(save, selectedDwellerId, fn));
  }),
  updateDwellerRaw: (id, fn) => set((state) => {
    const { save } = state;
    if (!save) return {};
    return commit(save, editDweller(save, id, fn));
  }),
  swapSelectedGear: (fn, stash) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save || selectedDwellerId === null) return {};
    return commit(save, editDweller(save, selectedDwellerId, fn, stash));
  }),
  equipSelectedFromStash: (index) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save || selectedDwellerId === null) return {};
    return commit(save, equipFromStash(save, selectedDwellerId, index));
  }),
  setVault: (fn) => set((state) => (state.save ? commit(state.save, fn(state.save)) : {})),
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
    set({
      save: { ...save, dwellers: { ...save.dwellers, dwellers: [...existing, dweller] } },
      selectedDwellerId: dweller.serializeId,
      page: 'dweller',
    });
    return dweller.serializeId;
  },
  removeDweller: (id, opts) => set((state) => {
    const { save, selectedDwellerId } = state;
    if (!save) return {};
    const evicted = save.dwellers.dwellers.find((d) => d.serializeId === id);
    const gear = opts?.stashGear && evicted ? equippedGear(evicted) : [];
    if (gear.length > 0 && !canStash(save, gear.length)) return {};
    const remaining = save.dwellers.dwellers.filter((d) => d.serializeId !== id);
    const nextSelected = selectedDwellerId === id
      ? (remaining[0]?.serializeId ?? null)
      : selectedDwellerId;
    const unassigned = unassignDweller(save, id);
    return {
      save: addStashItems({ ...unassigned, dwellers: { ...save.dwellers, dwellers: remaining } }, gear),
      selectedDwellerId: nextSelected,
    };
  }),
  clear: () => set({
    save: null, selectedDwellerId: null, fileName: null, isDemo: false, roomFilter: ALL_ROOMS, roomQuery: '',
  }),
}));
