import type { PetIndex } from '../types/pets';

let cached: PetIndex | null = null;
let pending: Promise<PetIndex> | null = null;

/** Reset module-level cache (for tests only). */
export function _resetPetCache(): void { cached = null; pending = null; }

export async function loadPetIndex(): Promise<PetIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/pets.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load pet index: ${r.status}`);
      return r.json() as Promise<PetIndex>;
    })
    .then((idx) => { cached = idx; return idx; })
    .finally(() => { pending = null; });
  return pending;
}
