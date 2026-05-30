import type { SpriteIndex, AtlasRect } from '../types/pieces';
import type { MeshGeometry } from '../types/mesh';
import { pieceByName, pieceByGuid } from './spriteIndex';
import { faceNameForHappiness, type RenderableDweller, type Rgb } from './dwellerRender';

export type LayerSlot = 'body' | 'outfit' | 'face' | 'hair' | 'helmet' | 'hand' | 'headgear';

/**
 * Port of DwellerOutfit.ValidateColor: snap a desired RGB (0..255) to the
 * nearest entry of the outfit's m_colors (rgba 0..1). Returns desired unchanged
 * when the outfit defines no colors.
 */
export function nearestOutfitColor(
  desired: Rgb,
  colors?: [number, number, number, number][],
): Rgb {
  if (!colors || colors.length === 0) return { r: desired.r, g: desired.g, b: desired.b };
  const dr = desired.r / 255, dg = desired.g / 255, db = desired.b / 255;
  let best = colors[0], bestD = Infinity;
  for (const c of colors) {
    const d = (c[0] - dr) ** 2 + (c[1] - dg) ** 2 + (c[2] - db) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return {
    r: Math.round(best[0] * 255),
    g: Math.round(best[1] * 255),
    b: Math.round(best[2] * 255),
  };
}

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
  /** When set, draw this mesh instead of the body mesh for this layer. */
  meshOverride?: MeshGeometry;
  /** When set, only draw this submesh range of meshOverride (hat quad only). */
  meshSubmesh?: { start: number; count: number };
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
export function buildLayers(
  dweller: RenderableDweller,
  idx: SpriteIndex,
  offsets?: GenderOffsets,
  meshes?: { largeHeadgear?: Record<string, { male: MeshGeometry | null; female: MeshGeometry | null }> },
): RenderLayer[] {
  const gender: 'male' | 'female' = dweller.gender === 2 ? 'male' : 'female';
  const layers: RenderLayer[] = [];
  const faceOff = offsets?.face ?? [0, 0];
  const handOff = offsets?.hand ?? [0, 0];

  // AtlasScale / AtlasOffset for a piece: bounds normalized by atlas size.
  const ownScale = (b: AtlasRect): [number, number] => [b.w / ATLAS, b.h / ATLAS];
  const ownOffset = (b: AtlasRect): [number, number] => [b.x / ATLAS, b.y / ATLAS];

  const outfit = dweller.outfitName ? pieceByName(idx, 'outfit', dweller.outfitName, gender) : null;
  const wantBody = outfit?.flags.hasSkirt && gender === 'female' ? 'skirt_body' : 'base_body';
  const body = pieceByName(idx, 'body', wantBody, gender) ?? pieceByName(idx, 'body', 'base_body', gender);

  // Body's scale is the reference scale reused by head-overlay pieces (hair/face/helmet).
  const bodyScale: [number, number] = body ? ownScale(body.bounds) : [1, 1];

  // Resolve outfit helmet (largeHeadgear uses a completely different mesh in the game
  // and cannot be rendered on the body mesh — skip it for helmet slot).
  const helmetGuid = outfit?.helmetGuid;
  const helmet = helmetGuid ? pieceByGuid(idx, 'helmet', helmetGuid) : null;

  // Outfit tint: snap to nearest allowed color (port of DwellerOutfit.ValidateColor).
  // Fall back to the outfit's first color for single-color "Special" outfits.
  const desiredOutfitRgb: Rgb = dweller.outfitColor ?? { r: 255, g: 255, b: 255 };
  const outfitTintRgb = nearestOutfitColor(desiredOutfitRgb, outfit?.colors);

  // --- Hands/gloves go FIRST so arms/outfit render on top of them (z-order). ---
  // Pick the gender-matching glovePose from the outfit; fall back to bare handPose/fists.
  const gloveGuid = outfit?.glovePoseGuids?.find((g) =>
    pieceByGuid(idx, 'glovePose', g)?.gender === gender || pieceByGuid(idx, 'glovePose', g)?.gender === 'any',
  );
  const handPiece = gloveGuid
    ? pieceByGuid(idx, 'glovePose', gloveGuid)
    : pieceByName(idx, 'handPose', 'fists', gender);
  if (handPiece) {
    const o = ownOffset(handPiece.bounds);
    layers.push({
      slot: 'hand', atlas: handPiece.atlas, bounds: handPiece.bounds,
      tint: gloveGuid ? toTint(outfitTintRgb) : toTint(dweller.skinColor),
      uvScale: bodyScale, uvOffset: [o[0] + handOff[0], o[1] + handOff[1]],
    });
  }

  // --- Body and outfit ---
  if (body) {
    layers.push({
      slot: 'body', atlas: body.atlas, bounds: body.bounds, tint: toTint(dweller.skinColor),
      uvScale: ownScale(body.bounds), uvOffset: ownOffset(body.bounds),
    });
  }
  if (outfit) {
    // Draw the outfit sprite WITHOUT color tint (preserves base colors: pants, belt, shoes).
    layers.push({
      slot: 'outfit', atlas: outfit.atlas, bounds: outfit.bounds,
      uvScale: ownScale(outfit.bounds), uvOffset: ownOffset(outfit.bounds),
    });
    // If the outfit has a coloring mask, draw it WITH the outfit color tint on top.
    // The mask PNG is opaque only where the color should be applied (cloak, shoulder pads, etc).
    // This replicates DwellerOutfit.ValidateColor + the shader's color-mask blending.
    const colorMask = outfit.coloringMaskGuid
      ? pieceByGuid(idx, 'outfitColoringMask', outfit.coloringMaskGuid)
      : null;
    if (colorMask && outfitTintRgb) {
      // Use the mask's own atlas position for UV sampling (colorMask is in a separate mask atlas).
      // The mask has the same dimensions as the outfit so triangle selection is identical.
      layers.push({
        slot: 'outfit', atlas: colorMask.atlas, bounds: colorMask.bounds, tint: toTint(outfitTintRgb),
        uvScale: ownScale(colorMask.bounds), uvOffset: ownOffset(colorMask.bounds),
      });
    }
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
    layers.push({
      slot: 'face', atlas: face.atlas, bounds: face.bounds, tint: toTint(dweller.skinColor),
      uvScale: bodyScale, uvOffset: [o[0] + faceOff[0], o[1] + faceOff[1]],
    });
  }

  // Hair — hidden when the outfit's helmet is exclusive (m_isExclusive).
  const hairExcluded = helmet?.flags.isExclusive === true;
  const hair = (!hairExcluded && dweller.hairName)
    ? pieceByName(idx, 'hair', dweller.hairName, gender)
    : null;
  if (hair && !hair.flags.isBald) {
    const o = ownOffset(hair.bounds);
    layers.push({
      slot: 'hair', atlas: hair.atlas, bounds: hair.bounds, tint: toTint(dweller.hairColor),
      uvScale: bodyScale, uvOffset: [o[0] + faceOff[0], o[1] + faceOff[1]],
    });
  }

  // Helmet — head overlay, same UV transform as hair/face (bodyScale + faceOffset).
  if (helmet) {
    const o = ownOffset(helmet.bounds);
    layers.push({
      slot: 'helmet', atlas: helmet.atlas, bounds: helmet.bounds,
      uvScale: bodyScale, uvOffset: [o[0] + faceOff[0], o[1] + faceOff[1]],
    });
  }

  // largeHeadgear (e.g. Bishop mitre) — has its own prebaked hat mesh; draw only the hat quad.
  const largeHeadgearPiece = outfit?.largeHeadgearGuid
    ? pieceByGuid(idx, 'largeHeadgear', outfit.largeHeadgearGuid)
    : null;
  const largeHeadgearMesh = largeHeadgearPiece && meshes?.largeHeadgear?.[largeHeadgearPiece.guid]
    ? (gender === 'male'
        ? meshes.largeHeadgear[largeHeadgearPiece.guid].male
        : (meshes.largeHeadgear[largeHeadgearPiece.guid].female
            ?? meshes.largeHeadgear[largeHeadgearPiece.guid].male))
    : null;

  if (largeHeadgearPiece && largeHeadgearMesh) {
    layers.push({
      slot: 'headgear',
      atlas: largeHeadgearPiece.atlas,
      bounds: largeHeadgearPiece.bounds,
      uvScale: ownScale(largeHeadgearPiece.bounds),
      uvOffset: ownOffset(largeHeadgearPiece.bounds),
      meshOverride: largeHeadgearMesh,
      meshSubmesh: largeHeadgearMesh.indexCounts && largeHeadgearMesh.indexCounts.length > 1
        ? { start: largeHeadgearMesh.indexCounts[0], count: largeHeadgearMesh.indexCounts[1] }
        : undefined,
    });
  }

  return layers;
}

export interface BuildLayersResult {
  layers: RenderLayer[];
  unknownOutfit?: string; // original outfit name when it was not found in the index
}

export function buildLayersWithMeta(
  dweller: RenderableDweller,
  idx: SpriteIndex,
  offsets?: GenderOffsets,
  meshes?: { largeHeadgear?: Record<string, { male: MeshGeometry | null; female: MeshGeometry | null }> },
): BuildLayersResult {
  const gender: 'male' | 'female' = dweller.gender === 2 ? 'male' : 'female';
  let unknownOutfit: string | undefined;
  let effective = dweller;

  if (dweller.outfitName && !pieceByName(idx, 'outfit', dweller.outfitName, gender)) {
    unknownOutfit = dweller.outfitName;
    effective = { ...dweller, outfitName: 'jumpsuit' };
  }

  return { layers: buildLayers(effective, idx, offsets, meshes), unknownOutfit };
}
