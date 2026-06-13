import type { SpriteIndex, PieceRef, PieceType, OutfitItem } from '../types/pieces';

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

/** Look up an outfit item by its save id (equipedOutfit.id). */
export function outfitItemById(idx: SpriteIndex, id: string): OutfitItem | null {
  return idx.outfitItems?.find((o) => o.id === id) ?? null;
}

/**
 * Resolve the visual outfit piece to render for a given equipped outfit id.
 * Maps the item id to its gender-appropriate visual piece (handling variants and
 * uniques whose item id differs from the piece name). Falls back to treating the
 * id itself as a piece name (legacy/base outfits where the two coincide).
 */
export function outfitPieceFor(
  idx: SpriteIndex,
  id: string,
  gender: 'male' | 'female',
): PieceRef | null {
  const item = outfitItemById(idx, id);
  if (item) {
    const preferred = gender === 'male' ? item.pieceMale : item.pieceFemale;
    const other = gender === 'male' ? item.pieceFemale : item.pieceMale;
    const pieceName = preferred ?? other;
    if (pieceName) return pieceByName(idx, 'outfit', pieceName, gender);
  }
  return pieceByName(idx, 'outfit', id, gender);
}

/**
 * Player-equippable outfit items: Premium plus the default vault jumpsuit. When a
 * `gender` is given, only items with a visual for that gender are returned —
 * many outfits are gender-specific in the game (e.g. Action Wedding Dress is
 * female-only, Ninja Outfit is male-only), so a male dweller must not be offered
 * female-only outfits and vice versa.
 */
export function equippableOutfits(idx: SpriteIndex, gender?: 'male' | 'female'): OutfitItem[] {
  const items = idx.outfitItems ?? [];
  return items.filter((o) => {
    if (o.category !== 2 && o.id !== 'jumpsuit') return false;
    const piece = gender === 'male' ? o.pieceMale : gender === 'female' ? o.pieceFemale : (o.pieceMale || o.pieceFemale);
    return !!piece;
  });
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

/**
 * Whether a hair piece named `name` has art for `gender`. Hair assets are split
 * per gender (a male and a female piece can share a name), so a piece counts only
 * if it's tagged for that gender or 'any'. Used when changing a dweller's gender:
 * hair with no art for the new gender must fall back to a default.
 */
export function hairValidForGender(idx: SpriteIndex, name: string, gender: 'male' | 'female'): boolean {
  const list = idx.byType.hair ?? [];
  return list.some((p) => p.name === name && (p.gender === gender || p.gender === 'any'));
}

/**
 * Whether the equipped outfit `id` has a visual piece for `gender`. Premium/unique
 * outfits are often gender-specific (Action Wedding Dress is female-only, Ninja
 * Outfit is male-only), so switching gender can leave a dweller wearing an outfit
 * with no art for them — in which case it must fall back to the vault jumpsuit.
 */
export function outfitValidForGender(idx: SpriteIndex, id: string, gender: 'male' | 'female'): boolean {
  const item = outfitItemById(idx, id);
  if (item) return !!(gender === 'male' ? item.pieceMale : item.pieceFemale);
  // Legacy/base outfits whose item id coincides with the piece name.
  const list = idx.byType.outfit ?? [];
  return list.some((p) => p.name === id && (p.gender === gender || p.gender === 'any'));
}

/** Default hair piece name for a gender (the first default hair, or '1' if none). */
export function defaultHairFor(idx: SpriteIndex, gender: 'male' | 'female'): string {
  const list = idx.byType.hair ?? [];
  const hit = list.find(
    (p) => (p.gender === gender || p.gender === 'any') && p.flags.isUsedByDefault !== false,
  );
  return hit?.name ?? '1';
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
