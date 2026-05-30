import type { SpriteIndex, AtlasRect } from '../types/pieces';
import { pieceByName } from './spriteIndex';
import { faceNameForHappiness, type RenderableDweller, type Rgb } from './dwellerRender';

export type LayerSlot = 'body' | 'outfit' | 'face' | 'hair';

// All dweller atlases are 1024x1024; the game normalizes AtlasOffset/AtlasScale by
// this size (see DwellerPiece.SetAtlasRef + Dressup.UpdateTexture).
const ATLAS = 1024;

/** Override used only for triangle masking (filterTriangles); texture UV uses uvScale/uvOffset. */
export interface TriMask {
  uvScale: [number, number];
  uvOffset: [number, number];
  bounds: AtlasRect;
}

export interface RenderLayer {
  slot: LayerSlot;
  atlas: string;            // atlas image filename
  bounds: AtlasRect;        // pixel rect inside that atlas
  tint?: Rgb & { a: number };
  /**
   * Final UV transform: sampledUV = meshUV * uvScale + uvOffset (normalized 0..1).
   * See Dressup.UpdateTexture: body/outfit use own AtlasScale; hair/face use body scale.
   */
  uvScale: [number, number];
  uvOffset: [number, number];
  /**
   * When set, triangle masking uses this transform instead of the layer's own
   * uvScale/uvOffset/bounds. Used by the head-skin re-render layer so it masks
   * by the face layer's UV (guaranteed to select only head triangles) while
   * sampling the body texture.
   */
  triMask?: TriMask;
}

const toTint = (c?: Rgb): (Rgb & { a: number }) | undefined =>
  c ? { r: c.r, g: c.g, b: c.b, a: c.a == null ? 1 : c.a / 255 } : undefined;

export interface GenderOffsets {
  hand: [number, number];
  face: [number, number];
}

/**
 * Build ordered render layers (back-to-front). Each layer maps the gender mesh's
 * UVs into its atlas region; the WebGL renderer converts pixel bounds -> UV using
 * the loaded texture size and applies uvOffset (gender hand/face offset).
 */
export function buildLayers(dweller: RenderableDweller, idx: SpriteIndex, offsets?: GenderOffsets): RenderLayer[] {
  const gender: 'male' | 'female' = dweller.gender === 2 ? 'male' : 'female';
  const layers: RenderLayer[] = [];
  const faceOff = offsets?.face ?? [0, 0];

  // AtlasScale / AtlasOffset for a piece: bounds normalized by atlas size.
  const ownScale = (b: AtlasRect): [number, number] => [b.w / ATLAS, b.h / ATLAS];
  const ownOffset = (b: AtlasRect): [number, number] => [b.x / ATLAS, b.y / ATLAS];

  const outfit = dweller.outfitName ? pieceByName(idx, 'outfit', dweller.outfitName, gender) : null;
  const wantBody = outfit?.flags.hasSkirt && gender === 'female' ? 'skirt_body' : 'base_body';
  const body = pieceByName(idx, 'body', wantBody, gender) ?? pieceByName(idx, 'body', 'base_body', gender);

  // Body's scale is the reference scale reused by head-overlay pieces (hair).
  const bodyScale: [number, number] = body ? ownScale(body.bounds) : [1, 1];

  if (body) {
    layers.push({
      slot: 'body', atlas: body.atlas, bounds: body.bounds, tint: toTint(dweller.skinColor),
      uvScale: ownScale(body.bounds), uvOffset: ownOffset(body.bounds),
    });
  }
  if (outfit) {
    layers.push({
      slot: 'outfit', atlas: outfit.atlas, bounds: outfit.bounds, tint: toTint(dweller.outfitColor),
      uvScale: ownScale(outfit.bounds), uvOffset: ownOffset(outfit.bounds),
    });
  }

  // Re-render the head skin AFTER the outfit so it sits above the collar.
  // triMask reuses the face layer's UV transform (bodyScale + faceOffset) which is
  // guaranteed to select the correct head triangles; the texture UV stays as the
  // body's own scale/offset so it samples the correct skin from the body atlas.
  const face = pieceByName(idx, 'face', faceNameForHappiness(dweller.happinessValue), gender);
  if (body && face) {
    const faceO = ownOffset(face.bounds);
    layers.push({
      slot: 'body', atlas: body.atlas, bounds: body.bounds, tint: toTint(dweller.skinColor),
      uvScale: ownScale(body.bounds), uvOffset: ownOffset(body.bounds),
      triMask: {
        uvScale: bodyScale,
        uvOffset: [faceO[0] + faceOff[0], faceO[1] + faceOff[1]],
        bounds: face.bounds,
      },
    });
  }
  if (face) {
    const o = ownOffset(face.bounds);
    // Face, like hair, is a head overlay: reuse the body's reference scale so the
    // head region maps onto the (packed) sprite, then bias by the gender face offset.
    // (The game uses (2,2) because its source face texture is full-resolution; our
    // atlas sprites are cropped, so the body-scale analog is the correct mapping.)
    layers.push({
      slot: 'face', atlas: face.atlas, bounds: face.bounds, tint: toTint(dweller.skinColor),
      uvScale: bodyScale, uvOffset: [o[0] + faceOff[0], o[1] + faceOff[1]],
    });
  }

  const hair = dweller.hairName ? pieceByName(idx, 'hair', dweller.hairName, gender) : null;
  if (hair && !hair.flags.isBald) {
    const o = ownOffset(hair.bounds);
    layers.push({
      slot: 'hair', atlas: hair.atlas, bounds: hair.bounds, tint: toTint(dweller.hairColor),
      uvScale: bodyScale, uvOffset: [o[0] + faceOff[0], o[1] + faceOff[1]],
    });
  }

  return layers;
}
