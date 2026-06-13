export type SortDir = 'default' | 'asc' | 'desc';
export type SpecialKey = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

interface HasDamage { damageMin: number; damageMax: number; }
interface HasSpecial { special?: Partial<Record<SpecialKey, number>>; }

const avg = (w: HasDamage) => (w.damageMin + w.damageMax) / 2;

/** Sum of all SPECIAL bonuses an outfit grants (0 when it grants none). */
const specialTotal = (o: HasSpecial) =>
  Object.values(o.special ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);

/** Sort a copy of weapons by average damage. `default` keeps the original order. */
export function sortByDamage<T extends HasDamage>(items: T[], dir: SortDir): T[] {
  if (dir === 'default') return [...items];
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * (avg(a) - avg(b)));
}

/**
 * When `stat` is set, keep only outfits granting that SPECIAL stat; sort by its
 * value unless `dir` is `default` (then keep original order). When `stat` is null,
 * return the items unchanged.
 */
export function filterAndSortOutfits<T extends HasSpecial>(items: T[], stat: SpecialKey | null, dir: SortDir): T[] {
  if (!stat) return items;
  const filtered = items.filter((o) => (o.special?.[stat] ?? 0) > 0);
  if (dir === 'default') return filtered;
  const sign = dir === 'asc' ? 1 : -1;
  return filtered.sort((a, b) => sign * ((a.special?.[stat] ?? 0) - (b.special?.[stat] ?? 0)));
}

/**
 * Sort a copy of outfits by the SUM of all their SPECIAL bonuses. Used when no
 * single stat is selected but a sort direction is. `default` keeps the original
 * order.
 */
export function sortBySpecialTotal<T extends HasSpecial>(items: T[], dir: SortDir): T[] {
  if (dir === 'default') return [...items];
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * (specialTotal(a) - specialTotal(b)));
}

/**
 * Case-insensitive substring filter. Empty/whitespace query returns the input
 * array unchanged (same reference) so callers can skip work.
 */
export function filterByText<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => getText(it).toLowerCase().includes(q));
}
