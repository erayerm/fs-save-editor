import type { SpriteIndex, AtlasRect } from '../types/pieces';
import { pieceByName } from './spriteIndex';
import { faceNameForHappiness, type RenderableDweller, type Rgb } from './dwellerRender';

export type LayerSlot = 'body' | 'outfit' | 'face' | 'hair';

export interface RenderLayer {
  slot: LayerSlot;
  atlas: string;            // atlas image filename
  bounds: AtlasRect;        // pixel rect inside that atlas (Unity bottom-up Y)
  tint?: Rgb & { a: number };
  /** Gender offset hint applied to this layer's UV (model-space UV units). */
  uvOffset?: [number, number];
}

const toTint = (c?: Rgb): (Rgb & { a: number }) | undefined =>
  c ? { r: c.r, g: c.g, b: c.b, a: c.a == null ? 1 : c.a / 255 } : undefined;

/**
 * Build ordered render layers (back-to-front). Each layer maps the gender mesh's
 * UVs into its atlas region; the WebGL renderer converts pixel bounds -> UV using
 * the loaded texture size and applies uvOffset (gender hand/face offset).
 */
export function buildLayers(dweller: RenderableDweller, idx: SpriteIndex): RenderLayer[] {
  const gender: 'male' | 'female' = dweller.gender === 2 ? 'male' : 'female';
  const layers: RenderLayer[] = [];

  const outfit = dweller.outfitName ? pieceByName(idx, 'outfit', dweller.outfitName, gender) : null;
  const wantBody = outfit?.flags.hasSkirt && gender === 'female' ? 'skirt_body' : 'base_body';
  const body = pieceByName(idx, 'body', wantBody, gender) ?? pieceByName(idx, 'body', 'base_body', gender);

  if (body) layers.push({ slot: 'body', atlas: body.atlas, bounds: body.bounds, tint: toTint(dweller.skinColor) });
  if (outfit) layers.push({ slot: 'outfit', atlas: outfit.atlas, bounds: outfit.bounds, tint: toTint(dweller.outfitColor) });

  const face = pieceByName(idx, 'face', faceNameForHappiness(dweller.happinessValue), gender);
  if (face) layers.push({ slot: 'face', atlas: face.atlas, bounds: face.bounds, tint: toTint(dweller.skinColor) });

  const hair = dweller.hairName ? pieceByName(idx, 'hair', dweller.hairName, gender) : null;
  if (hair && !hair.flags.isBald) {
    layers.push({ slot: 'hair', atlas: hair.atlas, bounds: hair.bounds, tint: toTint(dweller.hairColor) });
  }

  return layers;
}
