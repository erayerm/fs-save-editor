import type { DwellerMeshSet } from '../types/mesh';

let cache: Promise<DwellerMeshSet> | null = null;

export function loadMeshSet(): Promise<DwellerMeshSet> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL ?? '/'}atlas/meshes.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load meshes.json (${r.status})`);
      return r.json() as Promise<DwellerMeshSet>;
    });
  }
  return cache;
}

/** Test-only: clear the module cache. */
export function _resetMeshCache() {
  cache = null;
}
