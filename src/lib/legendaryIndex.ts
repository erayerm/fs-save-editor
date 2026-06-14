import type { LegendaryIndex } from '../types/legendary';

let cached: LegendaryIndex | null = null;
let pending: Promise<LegendaryIndex> | null = null;

/** Reset module-level cache (for tests only). */
export function _resetLegendaryCache(): void { cached = null; pending = null; }

export async function loadLegendaryIndex(): Promise<LegendaryIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/legendaries.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load legendary index: ${r.status}`);
      return r.json() as Promise<LegendaryIndex>;
    })
    .then((idx) => { cached = idx; return idx; })
    .finally(() => { pending = null; });
  return pending;
}
