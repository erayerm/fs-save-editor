export type SortDir = 'asc' | 'desc';
export type SpecialKey = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

interface HasDamage { damageMin: number; damageMax: number; }
interface HasSpecial { special?: Partial<Record<SpecialKey, number>>; }

const avg = (w: HasDamage) => (w.damageMin + w.damageMax) / 2;

/** Sort a copy of weapons by average damage. */
export function sortByDamage<T extends HasDamage>(items: T[], dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * (avg(a) - avg(b)));
}

/**
 * When `stat` is set, keep only outfits granting that SPECIAL stat and sort by its
 * value; when null, return the items unchanged (caller keeps default order).
 */
export function filterAndSortOutfits<T extends HasSpecial>(items: T[], stat: SpecialKey | null, dir: SortDir): T[] {
  if (!stat) return items;
  const sign = dir === 'asc' ? 1 : -1;
  return items
    .filter((o) => (o.special?.[stat] ?? 0) > 0)
    .sort((a, b) => sign * ((a.special?.[stat] ?? 0) - (b.special?.[stat] ?? 0)));
}
