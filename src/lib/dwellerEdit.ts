import type { Dweller, Special } from '../types/save';
import { SPECIAL_ORDER } from '../types/save';
import type { Rgb } from './dwellerRender';
import { encodeArgb } from './colors';

export interface DwellerCustomization {
  hair?: string;
  outfitId?: string;
  /** Male facial-hair piece name, written to the save's `faceMask` key. `null` clears it. */
  facialHair?: string | null;
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

export function applyCustomization(d: Dweller, patch: DwellerCustomization): Dweller {
  const next = { ...(d as Record<string, unknown>) } as Record<string, unknown>;
  if (patch.hair !== undefined) next.hair = patch.hair;
  // Facial hair persists on the dweller's `faceMask` key (a piece name, or null for none).
  if (patch.facialHair !== undefined) next.faceMask = patch.facialHair;
  if (patch.outfitId !== undefined) {
    const cur = (next.equipedOutfit as Record<string, unknown>) ?? {};
    next.equipedOutfit = { ...cur, id: patch.outfitId };
  }
  if (patch.skinColor !== undefined) next.skinColor = encodeArgb(patch.skinColor);
  if (patch.hairColor !== undefined) next.hairColor = encodeArgb(patch.hairColor);
  if (patch.outfitColor !== undefined) next.outfitColor = encodeArgb(patch.outfitColor);
  return next as unknown as Dweller;
}

const clampStat = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

export function setStat(d: Dweller, stat: Special, value: number): Dweller {
  const i = SPECIAL_ORDER.indexOf(stat) + 1; // 1-based; slot 0 is placeholder
  const cur = d.stats?.stats ?? [];
  const stats = cur.map((s, idx) => (idx === i ? { ...s, value: clampStat(value) } : s));
  return { ...d, stats: { ...(d.stats ?? {}), stats } } as Dweller;
}

export function setName(d: Dweller, patch: { name?: string; lastName?: string }): Dweller {
  return {
    ...d,
    name: patch.name !== undefined ? patch.name.trim() : d.name,
    lastName: patch.lastName !== undefined ? patch.lastName.trim() : d.lastName,
  };
}

export function setWeapon(d: Dweller, weaponId: string): Dweller {
  const cur = (d.equipedWeapon ?? { type: 'Weapon' }) as Record<string, unknown>;
  return { ...d, equipedWeapon: { ...cur, id: weaponId, type: 'Weapon' } } as Dweller;
}
