import type { SaveJson } from '../types/save';

type Resources = Record<string, number>;
const resources = (s: SaveJson): Resources =>
  ((s.vault as any)?.storage?.resources ?? {}) as Resources;

export function getCaps(s: SaveJson): number { return resources(s).Nuka ?? 0; }
export function getLunchboxes(s: SaveJson): number { return ((s.vault as any)?.LunchBoxesCount ?? 0) as number; }

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
export function setLunchboxes(s: SaveJson, n: number): SaveJson {
  return { ...s, vault: { ...((s.vault ?? {}) as any), LunchBoxesCount: Math.max(0, Math.round(n)) } };
}
