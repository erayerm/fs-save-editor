import { useState, useEffect } from 'react';
import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { UnknownItemCard } from './UnknownItemCard';
import { useUnknownItemGuard } from './UnknownItemModal';
import { faceMaskPieces, faceMaskPiecesByCategory, isFacialHairPiece, type FaceMaskCategory } from '../../lib/spriteIndex';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { loadMeshSet } from '../../lib/meshLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { HAIR_PRESETS } from '../../lib/colorPresets';
import { getCachedHeadThumbnail, renderHeadThumbnail } from '../../lib/headThumbnail';
import { type ModelBounds } from '../../lib/dwellerWebGL';
import { useFavorites } from '../../lib/useFavorites';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

// Sentinel grid value for the "no face piece" choice (maps to a null save value).
const NONE = '__none__';
const CELL = 170;

// Same head-zoom as the Hair/Facial Hair pickers so pieces read clearly.
const HEAD_BOUNDS: ModelBounds = { minX: -0.5, maxX: 0.5, minY: 1.1, maxY: 2.1 };

const CATEGORY_LABELS: Record<FaceMaskCategory, string> = {
  facialHair: 'Facial Hair',
  glasses: 'Glasses',
  makeup: 'Makeup',
  scars: 'Scars',
  other: 'Other',
};

// Build head thumbnails showing the dweller's current head PLUS each faceMask option.
// Mirrors the old FacialHairTab hook but is gender-aware (no male-only assumption);
// buildLayers tints facial hair with hair color and leaves decorations untinted.
function useFaceThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

  const genderKey = dweller.gender === 2 ? 'male' : 'female';
  const skin = dweller.skinColor;
  const hair = dweller.hairColor;
  const hairName = dweller.hairName ?? '-';
  const skinKey = skin ? `${skin.r},${skin.g},${skin.b}` : 'default';
  const hairKey = hair ? `${hair.r},${hair.g},${hair.b}` : 'default';
  const debouncedSkinKey = useDebouncedValue(skinKey, 250);
  const debouncedHairKey = useDebouncedValue(hairKey, 250);

  useEffect(() => {
    if (!meshSet) return;
    let cancelled = false;

    const keyFor = (pieceName: string) =>
      `face|${genderKey}|${debouncedSkinKey}|${debouncedHairKey}|${hairName}|${pieceName}`;

    (async () => {
      const side = genderKey === 'male' ? meshSet.male : meshSet.female;
      const mesh = side.adult;
      const offsets = side.offsets;
      // "None" first, then every faceMask piece for this gender.
      const pieces = [{ name: NONE }, ...faceMaskPieces(index, genderKey)];
      const next = new Map<string, string>();

      // Seed with cached thumbnails so they appear instantly.
      for (const piece of pieces) {
        const hit = getCachedHeadThumbnail(keyFor(piece.name));
        if (hit) next.set(piece.name, hit);
      }
      if (!cancelled && next.size > 0) setThumbnails(new Map(next));

      for (const piece of pieces) {
        if (cancelled) break;
        if (next.has(piece.name)) continue;

        const tempDweller: RenderableDweller = {
          ...dweller,
          facialHair: piece.name === NONE ? undefined : piece.name,
        };
        // Keep head-skin (body+triMask), face, hair, and the faceMask.
        const layers = buildLayers(tempDweller, index, offsets).filter(
          (l) =>
            (l.slot === 'body' && l.triMask != null) ||
            l.slot === 'face' ||
            l.slot === 'hair' ||
            l.slot === 'faceMask',
        );
        if (layers.length === 0) continue;

        const url = await renderHeadThumbnail(keyFor(piece.name), mesh, layers, HEAD_BOUNDS);
        if (cancelled) break;
        next.set(piece.name, url);
        setThumbnails(new Map(next));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, genderKey, hairName, debouncedSkinKey, debouncedHairKey]);

  return thumbnails;
}

// Face customization: every vanilla faceMask piece (facial hair, glasses, wrinkles,
// makeup, scars, decorations) grouped by category. The chosen piece persists on the
// dweller's `faceMask` save key (single slot).
export function FaceTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const [meshSet, setMeshSet] = useState<DwellerMeshSet | null>(null);
  useEffect(() => { loadMeshSet().then(setMeshSet); }, []);

  const genderKey = dweller.gender === 2 ? 'male' : 'female';
  const hairColor = dweller.hairColor ?? { r: 150, g: 95, b: 45 };
  const thumbnails = useFaceThumbnails(index, meshSet, dweller);

  const groups = faceMaskPiecesByCategory(index, genderKey);
  const allPieces = faceMaskPieces(index, genderKey);

  // The piece is unknown when set to something we don't know (newer game content or
  // a mod). Guard overwrites with a warning, same as the old Facial Hair tab.
  const facePiece = dweller.facialHair;
  const known = !facePiece || allPieces.some((p) => p.name === facePiece);
  const { isUnknown, openInfo, guardSelect, modal } = useUnknownItemGuard(facePiece, known);
  const { favorites, toggle } = useFavorites('face');
  const selected = dweller.facialHair ?? NONE;

  // The color palette tints hair-colored pieces (facial hair). It also drives the
  // head hair color, so only show it while a facial-hair piece is selected.
  const showColor = !!facePiece && isFacialHairPiece(facePiece);

  const cellFor = (name: string, label: string) => {
    const thumbnailUrl = thumbnails.get(name);
    return { value: name, label, thumbnailUrl, loading: !thumbnailUrl };
  };

  return (
    <div>
      {showColor && (
        <div className="sticky top-0 z-10 bg-zinc-900">
          <div className="pt-4 pb-3">
            <ColorPalette
              label="Face color"
              value={hairColor}
              swatches={HAIR_PRESETS}
              onChange={(c) => onChange({ hairColor: c })}
            />
          </div>
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={group.category} className={gi === 0 ? '' : 'mt-6'}>
          <h3 className="text-sm font-medium text-zinc-300 mb-2 px-1">
            {CATEGORY_LABELS[group.category]}
          </h3>
          <OptionGrid
            options={group.pieces.map((p) => cellFor(p.name, p.name))}
            selected={selected}
            onSelect={(v) => guardSelect(() => onChange({ facialHair: v === NONE ? null : v }))}
            cellW={CELL}
            cellH={CELL}
            favorites={favorites}
            onToggleFavorite={toggle}
            leading={gi === 0
              ? (
                <>
                  {isUnknown && facePiece && (
                    <UnknownItemCard id={facePiece} width={CELL} height={CELL} onWarn={openInfo} />
                  )}
                  <button
                    title="None"
                    aria-pressed={selected === NONE}
                    onClick={() => guardSelect(() => onChange({ facialHair: null }))}
                    className={
                      'rounded border overflow-hidden flex flex-col items-center ' +
                      (selected === NONE
                        ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500')
                    }
                    style={{ width: CELL, height: CELL, position: 'relative' }}
                  >
                    {thumbnails.get(NONE)
                      ? <img src={thumbnails.get(NONE)} alt="None" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      : <div className="w-full h-full rounded-md bg-zinc-700/40 animate-pulse" />}
                  </button>
                </>
              )
              : undefined}
          />
        </div>
      ))}
      {modal}
    </div>
  );
}
