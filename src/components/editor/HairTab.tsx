import { useState, useEffect } from 'react';
import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { piecesOfType } from '../../lib/spriteIndex';
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

const CELL = 170; // display cell px (square)

// Zoom into head region. Square 1.0×1.0 → no distortion on square canvas.
// Head visual centre ≈ y 1.6. ±0.5 shows hair above and a sliver of neck below.
const HEAD_BOUNDS: ModelBounds = { minX: -0.5, maxX: 0.5, minY: 1.1, maxY: 2.1 };

function useHairThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

  const gender = dweller.gender === 2 ? 'male' : 'female';
  const skin = dweller.skinColor;
  const hair = dweller.hairColor;
  const skinKey = skin ? `${skin.r},${skin.g},${skin.b}` : 'default';
  const hairKey = hair ? `${hair.r},${hair.g},${hair.b}` : 'default';

  // Debounce color-driven keys so the thumbnail grid only rebuilds after the
  // color picker settles. The main avatar preview path is unaffected.
  const debouncedSkinKey = useDebouncedValue(skinKey, 250);
  const debouncedHairKey = useDebouncedValue(hairKey, 250);

  useEffect(() => {
    if (!meshSet) return;
    let cancelled = false;

    (async () => {
      const mesh = meshSet[gender].adult;
      const offsets = meshSet[gender].offsets;
      const hairs = piecesOfType(index, 'hair', { gender });
      const next = new Map<string, string>();

      // Seed with anything already cached so previously-rendered (identical
      // per-gender) thumbnails appear instantly without re-rendering.
      for (const hairPiece of hairs) {
        const key = `hair|${gender}|${debouncedSkinKey}|${debouncedHairKey}|${hairPiece.name}`;
        const hit = getCachedHeadThumbnail(key);
        if (hit) next.set(hairPiece.name, hit);
      }
      if (!cancelled && next.size > 0) setThumbnails(new Map(next));

      for (const hairPiece of hairs) {
        if (cancelled) break;
        if (next.has(hairPiece.name)) continue;

        const key = `hair|${gender}|${debouncedSkinKey}|${debouncedHairKey}|${hairPiece.name}`;
        const tempDweller: RenderableDweller = { ...dweller, hairName: hairPiece.name };

        // Keep head-skin (body+triMask), face, and hair — no full body, no outfit.
        const layers = buildLayers(tempDweller, index, offsets).filter(
          (l) => (l.slot === 'body' && l.triMask != null) || l.slot === 'face' || l.slot === 'hair',
        );
        if (layers.length === 0) continue;

        const url = await renderHeadThumbnail(key, mesh, layers, HEAD_BOUNDS);
        if (cancelled) break;
        next.set(hairPiece.name, url);
        setThumbnails(new Map(next));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, gender, debouncedSkinKey, debouncedHairKey]);

  return thumbnails;
}

export function HairTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const [meshSet, setMeshSet] = useState<DwellerMeshSet | null>(null);
  useEffect(() => { loadMeshSet().then(setMeshSet); }, []);

  const gender = dweller.gender === 2 ? 'male' : 'female';
  const hairColor = dweller.hairColor ?? { r: 150, g: 95, b: 45 };
  const thumbnails = useHairThumbnails(index, meshSet, dweller);

  const options = piecesOfType(index, 'hair', { gender }).map((p) => ({
    value: p.name,
    label: p.name,
    thumbnailUrl: thumbnails.get(p.name),
  }));

  return (
    <div>
      {/* Outer sticky wrapper so the palette sticks without nesting issues */}
      <div className="sticky top-0 z-10 bg-zinc-900">
        <div className="pt-4 pb-3">
          <ColorPalette
            label="Hair color"
            value={hairColor}
            swatches={HAIR_PRESETS}
            onChange={(c) => onChange({ hairColor: c })}
          />
        </div>
      </div>
      <OptionGrid
        options={options}
        selected={dweller.hairName ?? null}
        onSelect={(v) => onChange({ hair: v })}
        cellW={CELL}
        cellH={CELL}
      />
    </div>
  );
}
