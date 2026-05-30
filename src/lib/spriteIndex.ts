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
