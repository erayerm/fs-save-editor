import type { Dweller } from '../types/save';
import type { Rgb } from './dwellerRender';
import { encodeArgb } from './colors';

export interface DwellerCustomization {
  hair?: string;
  outfitId?: string;
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

export function applyCustomization(d: Dweller, patch: DwellerCustomization): Dweller {
  const next = { ...(d as Record<string, unknown>) } as Record<string, unknown>;
  if (patch.hair !== undefined) next.hair = patch.hair;
  if (patch.outfitId !== undefined) {
    const cur = (next.equipedOutfit as Record<string, unknown>) ?? {};
    next.equipedOutfit = { ...cur, id: patch.outfitId };
  }
  if (patch.skinColor) next.skinColor = encodeArgb(patch.skinColor);
  if (patch.hairColor) next.hairColor = encodeArgb(patch.hairColor);
  if (patch.outfitColor) next.outfitColor = encodeArgb(patch.outfitColor);
  return next as unknown as Dweller;
}
