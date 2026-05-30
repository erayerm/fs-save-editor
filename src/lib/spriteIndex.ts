import type { SpriteIndex, PieceRef, PieceType } from '../types/pieces';

let cached: SpriteIndex | null = null;
let pending: Promise<SpriteIndex> | null = null;

export async function loadSpriteIndex(): Promise<SpriteIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/index.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load sprite index: ${r.status}`);
      return r.json() as Promise<SpriteIndex>;
    })
    .then((idx) => {
      cached = idx;
      return idx;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

// Dwellers reference pieces by NAME (e.g. d.hair = "21", d.equipedOutfit.id = "jumpsuit").
// The same name can exist for both genders as separate assets, so we disambiguate by
// gender: prefer an exact gender match, then a gender-'any' piece, then any name match.
export function pieceByName(
  idx: SpriteIndex,
  type: PieceType,
  name: string,
  gender?: 'male' | 'female',
): PieceRef | null {
  const list = idx.byType[type];
  if (!list) return null;
  const matches = list.filter((p) => p.name === name);
  if (matches.length === 0) return null;
  if (gender) {
    return (
      matches.find((p) => p.gender === gender) ??
      matches.find((p) => p.gender === 'any') ??
      matches[0]
    );
  }
  return matches[0];
}

export function pieceByGuid(
  idx: SpriteIndex,
  type: PieceType,
  guid: string,
): PieceRef | null {
  const list = idx.byType[type];
  if (!list) return null;
  return list.find((p) => p.guid === guid) ?? null;
}

// Male facial-hair (beard/mustache) pieces live in the `faceMask` type alongside
// decorations like glasses, makeup, scars and masks. The game distinguishes beards
// via DwellerFaceMask.m_useHairColor (the catalog's m_beards array), which the sprite
// index doesn't carry, so we identify them by name pattern instead:
//   - "f_hair_NN" : the generic male facial-hair set (save sample uses "f_hair_11")
//   - any name containing "beard" or "mustache"
// These are the hair-colored pieces shown in the male facial-hair customization UI.
export function isFacialHairPiece(name: string): boolean {
  const n = name.toLowerCase();
  return /^f_hair_\d+$/.test(name) || n.includes('beard') || n.includes('mustache');
}

// Male facial-hair faceMask pieces (see isFacialHairPiece).
export function facialHairPieces(idx: SpriteIndex): PieceRef[] {
  const list = idx.byType.faceMask;
  if (!list) return [];
  return list.filter((p) => (p.gender === 'male' || p.gender === 'any') && isFacialHairPiece(p.name));
}

export function piecesOfType(
  idx: SpriteIndex,
  type: PieceType,
  filter?: { gender?: 'male' | 'female'; defaultOnly?: boolean },
): PieceRef[] {
  let list = idx.byType[type];
  if (!list) return [];
  if (filter?.gender) list = list.filter((p) => p.gender === filter.gender || p.gender === 'any');
  if (filter?.defaultOnly) list = list.filter((p) => p.flags.isUsedByDefault !== false);
  return list;
}
