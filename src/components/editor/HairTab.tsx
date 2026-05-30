import { useState, useEffect, useRef } from 'react';
import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { piecesOfType } from '../../lib/spriteIndex';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { loadMeshSet } from '../../lib/meshLoader';
import { loadAtlas } from '../../lib/atlasLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer, type ModelBounds } from '../../lib/dwellerWebGL';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller, Rgb } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

const THUMB_SIZE = 340; // square offscreen canvas, displayed at 170×170
const CELL = 170;       // display cell px (square)

// Zoom into head region. Square 1.0×1.0 → no distortion on square canvas.
// Head visual centre ≈ y 1.6. ±0.5 shows hair above and a sliver of neck below.
const HEAD_BOUNDS: ModelBounds = { minX: -0.5, maxX: 0.5, minY: 1.1, maxY: 2.1 };

const HAIR_COLORS: Rgb[] = [
  { r: 30, g: 22, b: 18 }, { r: 80, g: 50, b: 30 }, { r: 150, g: 95, b: 45 },
  { r: 200, g: 160, b: 90 }, { r: 120, g: 30, b: 20 }, { r: 220, g: 220, b: 220 },
];

function useHairThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const rendererRef = useRef<DwellerRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = THUMB_SIZE;
        canvasRef.current.height = THUMB_SIZE;
      }
      if (!rendererRef.current) {
        rendererRef.current = createDwellerRenderer(canvasRef.current);
      }

      const mesh = meshSet[gender].adult;
      const offsets = meshSet[gender].offsets;
      const hairs = piecesOfType(index, 'hair', { gender });
      const newMap = new Map<string, string>();

      for (const hairPiece of hairs) {
        if (cancelled) break;
        const tempDweller: RenderableDweller = { ...dweller, hairName: hairPiece.name };

        // Keep head-skin (body+triMask), face, and hair — no full body, no outfit.
        const layers = buildLayers(tempDweller, index, offsets).filter(
          (l) => (l.slot === 'body' && l.triMask != null) || l.slot === 'face' || l.slot === 'hair',
        );
        if (layers.length === 0) continue;

        const withImages = await Promise.all(
          layers.map(async (l) => ({
            ...l,
            image: await loadAtlas(l.atlas),
            maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
          })),
        );
        if (cancelled) break;
        rendererRef.current!.draw(mesh, withImages, HEAD_BOUNDS);
        newMap.set(hairPiece.name, canvasRef.current!.toDataURL());
      }

      if (!cancelled) setThumbnails(new Map(newMap));
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, gender, debouncedSkinKey, debouncedHairKey]);

  useEffect(() => () => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
    canvasRef.current = null;
  }, []);

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
    <div className="space-y-4">
      <OptionGrid
        options={options}
        selected={dweller.hairName ?? null}
        onSelect={(v) => onChange({ hair: v })}
        cellW={CELL}
        cellH={CELL}
      />
      <ColorPalette
        label="Hair color"
        value={hairColor}
        swatches={HAIR_COLORS}
        onChange={(c) => onChange({ hairColor: c })}
      />
    </div>
  );
}
