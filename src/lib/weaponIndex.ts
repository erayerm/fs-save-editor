import type { WeaponIndex, WeaponMeta } from '../types/weapons';

let cached: WeaponIndex | null = null;
let pending: Promise<WeaponIndex> | null = null;

/** Reset module-level cache (for tests only). */
export function _resetWeaponCache(): void {
  cached = null;
  pending = null;
}

export async function loadWeaponIndex(): Promise<WeaponIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/weapons.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load weapon index: ${r.status}`);
      return r.json() as Promise<WeaponIndex>;
    })
    .then((idx) => {
      cached = idx;
      return idx;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function weaponById(idx: WeaponIndex, id: string): WeaponMeta | null {
  return idx.weapons[id] ?? null;
}
