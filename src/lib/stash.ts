import type { Dweller, EquipRef, SaveJson } from '../types/save';

// ---------------------------------------------------------------------------
// Vault stash (storage room). The game keeps every stored weapon, outfit, pet
// and junk item as its own entry in vault.inventory.items — duplicates are
// separate entries, never a quantity field.
// ---------------------------------------------------------------------------

export type StashItem = EquipRef;

/** Item ids every dweller starts with; these are never sent to the stash. */
export const DEFAULT_WEAPON_ID = 'Fist';
export const DEFAULT_OUTFIT_ID = 'jumpsuit';

// Shared so store selectors get a stable reference when the save has no stash.
const NO_ITEMS: StashItem[] = [];

export function getStashItems(s: SaveJson): StashItem[] {
  return (((s.vault as any)?.inventory?.items ?? NO_ITEMS) as StashItem[]);
}

function withItems(s: SaveJson, items: StashItem[]): SaveJson {
  const vault = (s.vault ?? {}) as any;
  return { ...s, vault: { ...vault, inventory: { ...(vault.inventory ?? {}), items } } };
}

export function addStashItems(s: SaveJson, added: StashItem[]): SaveJson {
  if (added.length === 0) return s;
  return withItems(s, [...getStashItems(s), ...added]);
}

export function removeStashItemAt(s: SaveJson, index: number): SaveJson {
  return removeStashItemsAt(s, [index]);
}

export function removeStashItemsAt(s: SaveJson, indices: number[]): SaveJson {
  const items = getStashItems(s);
  const drop = new Set(indices.filter((i) => i >= 0 && i < items.length));
  if (drop.size === 0) return s;
  return withItems(s, items.filter((_, i) => !drop.has(i)));
}

// ---------------------------------------------------------------------------
// Capacity. Every vault holds BASE_STASH_CAPACITY items; each Storage room adds
// a fixed amount by upgrade level (1-3) and merged width (1-3 rooms).
// Values from the Fallout Wiki storage room table.
// ---------------------------------------------------------------------------

export const BASE_STASH_CAPACITY = 10;

/** STORAGE_ROOM_CAPACITY[level - 1][mergeLevel - 1] */
export const STORAGE_ROOM_CAPACITY: readonly (readonly number[])[] = [
  [10, 20, 30],
  [15, 35, 75],
  [25, 55, 125],
];

const clampTier = (n: unknown) => Math.min(3, Math.max(1, Math.round(Number(n) || 1)));

export function stashCapacity(s: SaveJson): number {
  const rooms = (((s.vault as any)?.rooms ?? []) as { type?: string; level?: number; mergeLevel?: number }[]);
  return rooms
    .filter((r) => r.type === 'Storage')
    .reduce(
      (sum, r) => sum + STORAGE_ROOM_CAPACITY[clampTier(r.level) - 1][clampTier(r.mergeLevel) - 1],
      BASE_STASH_CAPACITY,
    );
}

/** Whether `count` more items fit in the stash. */
export function canStash(s: SaveJson, count = 1): boolean {
  return getStashItems(s).length + count <= stashCapacity(s);
}

/** Whether an equipped item is the starter Fist / vault jumpsuit (kept, not stashed). */
export function isDefaultGear(ref: EquipRef): boolean {
  return ref.id === DEFAULT_WEAPON_ID || ref.id === DEFAULT_OUTFIT_ID;
}

/** Dweller keys holding equipped gear. Pets use the double-p `equippedPet`. */
const GEAR_SLOTS = ['equipedWeapon', 'equipedOutfit', 'equippedPet'] as const;
type GearSlot = (typeof GEAR_SLOTS)[number];

const equippedIn = (d: Dweller, slot: GearSlot) => d[slot] as EquipRef | undefined;

/** The weapon, outfit and pet a dweller has equipped, excluding the default Fist / jumpsuit. */
export function equippedGear(d: Dweller): StashItem[] {
  const out: StashItem[] = [];
  for (const slot of GEAR_SLOTS) {
    const ref = equippedIn(d, slot);
    if (ref && typeof ref.id === 'string' && !isDefaultGear(ref)) out.push({ ...ref });
  }
  return out;
}

/** Same item: same id and the same extraData (a pet's name and bonus). */
const sameItem = (a: EquipRef, b: EquipRef | undefined) =>
  !!b && a.id === b.id && JSON.stringify(a.extraData ?? null) === JSON.stringify(b.extraData ?? null);

/**
 * The weapon/outfit/pet refs `before` had equipped that `after` no longer has,
 * excluding the default Fist and jumpsuit. These are what must go to the stash
 * when a dweller's gear is swapped.
 */
export function replacedGear(before: Dweller, after: Dweller): StashItem[] {
  const out: StashItem[] = [];
  for (const slot of GEAR_SLOTS) {
    const prev = equippedIn(before, slot);
    if (!prev || typeof prev.id !== 'string' || isDefaultGear(prev)) continue;
    if (sameItem(prev, equippedIn(after, slot))) continue;
    out.push({ ...prev });
  }
  return out;
}

function gearSlot(type: string): GearSlot | null {
  if (type === 'Weapon') return 'equipedWeapon';
  if (type === 'Outfit') return 'equipedOutfit';
  if (type === 'Pet') return 'equippedPet';
  return null;
}

/**
 * Equip stash item `index` on dweller `dwellerId`. The item it replaces takes
 * its place in the stash (nothing does when that was the default Fist /
 * jumpsuit or no pet), so the stash never grows. No-op for junk, or an unknown
 * index or dweller.
 */
export function equipFromStash(s: SaveJson, dwellerId: number, index: number): SaveJson {
  const items = getStashItems(s);
  const item = items[index];
  const slot = item ? gearSlot(item.type) : null;
  const dweller = s.dwellers.dwellers.find((d) => d.serializeId === dwellerId);
  if (!slot || !dweller) return s;

  const prev = equippedIn(dweller, slot);
  const nextItems = [...items];
  if (prev && typeof prev.id === 'string' && !isDefaultGear(prev)) nextItems[index] = { ...prev };
  else nextItems.splice(index, 1);

  const dwellers = s.dwellers.dwellers.map((d) =>
    d.serializeId === dwellerId ? { ...d, [slot]: { ...item } } : d,
  );
  return withItems({ ...s, dwellers: { ...s.dwellers, dwellers } }, nextItems);
}

// ---------------------------------------------------------------------------
// Grouping for display: identical entries (same type, id and extraData) are
// shown once with a count.
// ---------------------------------------------------------------------------

export interface StashGroup {
  key: string;
  item: StashItem;
  /** Indices into vault.inventory.items, in save order. */
  indices: number[];
}

const groupKey = (it: StashItem) =>
  `${it.type}|${it.id}|${JSON.stringify(it.extraData ?? null)}`;

export type StashSort = 'default' | 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc';

const TYPE_ORDER = ['Weapon', 'Outfit', 'Pet', 'Junk'];
const typeRank = (g: StashGroup) => {
  const i = TYPE_ORDER.indexOf(g.item.type);
  return i === -1 ? TYPE_ORDER.length : i;
};

/** Sort groups. 'default' is by type (weapons, outfits, pets, junk), then save order. */
export function sortStashGroups(
  groups: StashGroup[], sort: StashSort, nameOf: (g: StashGroup) => string,
): StashGroup[] {
  const byName = (a: StashGroup, b: StashGroup) => nameOf(a).localeCompare(nameOf(b));
  const cmp: Record<StashSort, (a: StashGroup, b: StashGroup) => number> = {
    'default': (a, b) => typeRank(a) - typeRank(b) || a.indices[0] - b.indices[0],
    'name-asc': byName,
    'name-desc': (a, b) => byName(b, a),
    'count-desc': (a, b) => b.indices.length - a.indices.length || byName(a, b),
    'count-asc': (a, b) => a.indices.length - b.indices.length || byName(a, b),
  };
  return [...groups].sort(cmp[sort]);
}

export function groupStash(items: StashItem[]): StashGroup[] {
  const groups = new Map<string, StashGroup>();
  items.forEach((item, i) => {
    const key = groupKey(item);
    const g = groups.get(key);
    if (g) g.indices.push(i);
    else groups.set(key, { key, item, indices: [i] });
  });
  return [...groups.values()];
}
