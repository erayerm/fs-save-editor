import { useState, useEffect, useRef } from 'react';
import { OptionGrid } from './OptionGrid';
import { piecesOfType } from '../../lib/spriteIndex';
import { loadMeshSet } from '../../lib/meshLoader';
import { loadAtlas } from '../../lib/atlasLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer } from '../../lib/dwellerWebGL';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

const THUMB_SIZE = 340; // offscreen WebGL canvas — 2× cell width (170px) for crisp display

/** Render outfit thumbnails via a single shared offscreen WebGL canvas. */
function useOutfitThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const rendererRef = useRef<DwellerRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gender = dweller.gender === 2 ? 'male' : 'female';
  const skinColor = dweller.skinColor;
  // Stable stringify for skinColor dep comparison
  const skinKey = skinColor ? `${skinColor.r},${skinColor.g},${skinColor.b}` : 'default';

  useEffect(() => {
    if (!meshSet) return;
    let cancelled = false;

    (async () => {
      // Create shared offscreen canvas + renderer once
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
      const outfits = piecesOfType(index, 'outfit', { gender });
      const newMap = new Map<string, string>();

      for (const outfit of outfits) {
        if (cancelled) break;
        // Build a temporary dweller with this outfit, no hair/face
        const tempDweller: RenderableDweller = {
          ...dweller,
          outfitName: outfit.name,
          hairName: undefined,
          happinessValue: undefined, // no face expression
        };
        // buildLayers then filter to body + outfit only (no face/hair)
        const layers = buildLayers(tempDweller, index, offsets).filter(
          (l) => l.slot !== 'face' && l.slot !== 'hair',
        );
        const withImages = await Promise.all(
          layers.map(async (l) => ({ ...l, image: await loadAtlas(l.atlas) })),
        );
        if (cancelled) break;
        rendererRef.current!.draw(mesh, withImages);
        newMap.set(outfit.name, canvasRef.current!.toDataURL());
      }

      if (!cancelled) setThumbnails(new Map(newMap));
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, gender, skinKey]);

  // Dispose renderer on unmount
  useEffect(() => () => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
    canvasRef.current = null;
  }, []);

  return thumbnails;
}

export function OutfitTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const [meshSet, setMeshSet] = useState<DwellerMeshSet | null>(null);
  useEffect(() => { loadMeshSet().then(setMeshSet); }, []);

  const gender = dweller.gender === 2 ? 'male' : 'female';
  const thumbnails = useOutfitThumbnails(index, meshSet, dweller);

  const options = piecesOfType(index, 'outfit', { gender }).map((p) => ({
    value: p.name,
    label: p.name,
    thumbnailUrl: thumbnails.get(p.name),
  }));

  return (
    <OptionGrid
      options={options}
      selected={dweller.outfitName ?? null}
      onSelect={(v) => onChange({ outfitId: v })}
    />
  );
}
