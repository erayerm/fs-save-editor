import type { Dweller } from '../types/save';
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
