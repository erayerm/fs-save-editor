import type { SaveJson } from '../types/save';

type Resources = Record<string, number>;
const resources = (s: SaveJson): Resources =>
  ((s.vault as any)?.storage?.resources ?? {}) as Resources;

export function getCaps(s: SaveJson): number { return resources(s).Nuka ?? 0; }

export function setResource(s: SaveJson, key: string, value: number): SaveJson {
  const v = Math.max(0, value);
  const vault = (s.vault ?? {}) as any;
  const storage = vault.storage ?? {};
  return {
    ...s,
    vault: { ...vault, storage: { ...storage, resources: { ...(storage.resources ?? {}), [key]: v } } },
  };
}
export const setCaps = (s: SaveJson, n: number) => setResource(s, 'Nuka', n);

// ---------------------------------------------------------------------------
// Lunchbox-style items. The game stores them in vault.LunchBoxesByType, an array
// where each entry is a type code, and vault.LunchBoxesCount is that array's
// length. We expose a count per type and rebuild the array on every edit.
// ---------------------------------------------------------------------------
export const BOX_TYPES = {
  Lunchbox: 0,
  MrHandy: 1,
  PetCarrier: 2,
  StarterPack: 3,
} as const;
export type BoxType = (typeof BOX_TYPES)[keyof typeof BOX_TYPES];

const boxesByType = (s: SaveJson): number[] =>
  (((s.vault as any)?.LunchBoxesByType ?? []) as number[]);

export function getBoxCount(s: SaveJson, type: BoxType): number {
  return boxesByType(s).filter((t) => t === type).length;
}
export const getLunchboxes = (s: SaveJson) => getBoxCount(s, BOX_TYPES.Lunchbox);

/**
 * Set the count of one box type. Rebuilds LunchBoxesByType from the four known
 * counts (Lunchbox, Mr. Handy, Pet Carrier, Starter Pack) and keeps
 * LunchBoxesCount in sync with the array length.
 */
export function setBoxCount(s: SaveJson, type: BoxType, value: number): SaveJson {
  const target = Math.max(0, Math.round(value));
  const counts = ([0, 1, 2, 3] as BoxType[]).map((t) =>
    t === type ? target : getBoxCount(s, t),
  );
  const types: number[] = [];
  counts.forEach((c, t) => {
    for (let i = 0; i < c; i++) types.push(t);
  });
  const vault = (s.vault ?? {}) as any;
  return {
    ...s,
    vault: { ...vault, LunchBoxesByType: types, LunchBoxesCount: types.length },
  };
}
export const setLunchboxes = (s: SaveJson, n: number) => setBoxCount(s, BOX_TYPES.Lunchbox, n);

// ---------------------------------------------------------------------------
// Vault mode — "Normal" or "Survival".
// ---------------------------------------------------------------------------
export type VaultMode = 'Normal' | 'Survival';

export function getVaultMode(s: SaveJson): VaultMode {
  return ((s.vault as any)?.VaultMode === 'Survival' ? 'Survival' : 'Normal');
}
export function setVaultMode(s: SaveJson, mode: VaultMode): SaveJson {
  return { ...s, vault: { ...((s.vault ?? {}) as any), VaultMode: mode } };
}
