import type { SpriteIndex, PieceRef } from '../types/pieces';
import { pieceByName } from './spriteIndex';

export interface DrawOp {
  atlas: string;
  src: { x: number; y: number; w: number; h: number };
  dst: { x: number; y: number; w: number; h: number };
  tint?: { r: number; g: number; b: number; a: number }; // rgb 0..255, a in 0..1
  composite?: GlobalCompositeOperation;                   // default 'source-over'
}

// Colors come pre-decoded from ARGB ints into 0..255 byte channels (see adapter in Task 7).
export interface Rgb {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a?: number; // 0..255, optional
}

// Minimal dweller shape this module reads. References are by NAME, not GUID.
export interface RenderableDweller {
  gender: number;            // 1 = female, 2 = male
  hairName?: string;         // d.hair  (e.g. "21", "hair_CooperHoward")
  outfitName?: string;       // d.equipedOutfit.id  (e.g. "jumpsuit")
  happinessValue?: number;   // 0..100 — face is derived from this
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

export interface RenderConfig {
  canvasW: number;
  canvasH: number;
}

// Face is not stored; derive it from happiness (from DwellerFace.cs thresholds).
export function faceNameForHappiness(happiness: number | undefined): string {
  const h = happiness ?? 100;
  if (h < 50) return 'Sad';
  if (h <= 75) return 'Neutral';
  return 'Smile';
}

export function buildDrawOps(
  dweller: RenderableDweller,
  idx: SpriteIndex,
  cfg: RenderConfig,
): DrawOp[] {
  const ops: DrawOp[] = [];
  const gender: 'male' | 'female' = dweller.gender === 2 ? 'male' : 'female';

  // Outfit (referenced by name).
  const outfit = dweller.outfitName
    ? pieceByName(idx, 'outfit', dweller.outfitName, gender)
    : null;

  // Body is not stored: default by gender + outfit skirt flag.
  const wantBody = outfit?.flags.hasSkirt && gender === 'female' ? 'skirt_body' : 'base_body';
  const body =
    pieceByName(idx, 'body', wantBody, gender) ??
    pieceByName(idx, 'body', 'base_body', gender);

  // Compute dst rect (centered, full canvas). Per-piece offset/scale is Plan 2b work.
  function dstFor(_p: PieceRef): DrawOp['dst'] {
    return { x: 0, y: 0, w: cfg.canvasW, h: cfg.canvasH };
  }
  function srcFor(p: PieceRef): DrawOp['src'] {
    return { x: p.bounds.x, y: p.bounds.y, w: p.bounds.w, h: p.bounds.h };
  }
  // Colors are already 0..255 ARGB-decoded bytes; alpha (0..255) → 0..1 for canvas.
  const colorToTint = (c?: Rgb) =>
    c ? { r: c.r, g: c.g, b: c.b, a: c.a == null ? 1 : c.a / 255 } : undefined;

  // 1. Body (tinted by skinColor via multiply)
  if (body) {
    ops.push({
      atlas: body.atlas, src: srcFor(body), dst: dstFor(body),
      tint: colorToTint(dweller.skinColor),
    });
  }
  // 2. Outfit
  if (outfit) {
    ops.push({ atlas: outfit.atlas, src: srcFor(outfit), dst: dstFor(outfit),
      tint: colorToTint(dweller.outfitColor) });
  }
  // 3. Face (derived from happiness)
  const face = pieceByName(idx, 'face', faceNameForHappiness(dweller.happinessValue), gender);
  if (face) ops.push({ atlas: face.atlas, src: srcFor(face), dst: dstFor(face) });
  // 4. Hair (tinted by hairColor)
  const hair = dweller.hairName ? pieceByName(idx, 'hair', dweller.hairName, gender) : null;
  if (hair && !hair.flags.isBald) {
    ops.push({
      atlas: hair.atlas, src: srcFor(hair), dst: dstFor(hair),
      tint: colorToTint(dweller.hairColor),
    });
  }

  return ops;
}
