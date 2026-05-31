import { useState, useEffect } from 'react';
import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { facialHairPieces } from '../../lib/spriteIndex';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { loadMeshSet } from '../../lib/meshLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { HAIR_PRESETS } from '../../lib/colorPresets';
import { getCachedHeadThumbnail, renderHeadThumbnail } from '../../lib/headThumbnail';
import { type ModelBounds } from '../../lib/dwellerWebGL';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

// Sentinel grid value for the "no facial hair" choice (maps to a null save value).
const NONE = '__none__';
const CELL = 170;

// Same head-zoom as the Hair picker so beards read clearly.
const HEAD_BOUNDS: ModelBounds = { minX: -0.5, maxX: 0.5, minY: 1.1, maxY: 2.1 };

// Build head thumbnails showing the dweller's current hair PLUS each beard option,
// so picking a beard is visual (mirrors HairTab, but keeps hair + adds the faceMask).
function useFacialHairThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

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
      `facial|${debouncedSkinKey}|${debouncedHairKey}|${hairName}|${pieceName}`;

    (async () => {
      const mesh = meshSet.male.adult; // facial hair is male-only
      const offsets = meshSet.male.offsets;
      // "None" first, then every beard piece.
      const pieces = [{ name: NONE }, ...facialHairPieces(index)];
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
        // Keep head-skin (body+triMask), face, hair, and the beard (faceMask).
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
  }, [index, meshSet, hairName, debouncedSkinKey, debouncedHairKey]);

  return thumbnails;
}

// Male facial-hair (beard/mustache) customization. The chosen piece persists on the
// dweller's `faceMask` save key.
export function FacialHairTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const [meshSet, setMeshSet] = useState<DwellerMeshSet | null>(null);
  useEffect(() => { loadMeshSet().then(setMeshSet); }, []);

  const hairColor = dweller.hairColor ?? { r: 150, g: 95, b: 45 };
  const thumbnails = useFacialHairThumbnails(index, meshSet, dweller);

  const options = [
    { value: NONE, label: 'None', thumbnailUrl: thumbnails.get(NONE) },
    ...facialHairPieces(index).map((p) => ({
      value: p.name,
      label: p.name,
      thumbnailUrl: thumbnails.get(p.name),
    })),
  ];

  return (
    <div>
      {/* Outer sticky wrapper so the palette sticks without nesting issues */}
      <div className="sticky top-0 z-10 bg-zinc-900">
        <div className="pt-4 pb-3">
          <ColorPalette
            label="Facial hair color"
            value={hairColor}
            swatches={HAIR_PRESETS}
            onChange={(c) => onChange({ hairColor: c })}
          />
        </div>
      </div>
      <OptionGrid
        options={options}
        selected={dweller.facialHair ?? NONE}
        onSelect={(v) => onChange({ facialHair: v === NONE ? null : v })}
        cellW={CELL}
        cellH={CELL}
      />
    </div>
  );
}
