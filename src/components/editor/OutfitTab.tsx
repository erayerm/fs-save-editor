import { useState, useEffect, useRef } from 'react';
import { OptionGrid } from './OptionGrid';
import { SpecialBadges } from './SpecialBadges';
import { equippableOutfits } from '../../lib/spriteIndex';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { loadMeshSet } from '../../lib/meshLoader';
import { loadAtlas } from '../../lib/atlasLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer } from '../../lib/dwellerWebGL';
import type { SpriteIndex, OutfitItem, Gender } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

const THUMB_SIZE = 340; // offscreen WebGL canvas — 2× cell width (170px) for crisp display

const VAULT_DEFAULT_OUTFIT = 'jumpsuit';

/**
 * The outfit items to show in the picker for a given gender: every equippable
 * (Premium + default jumpsuit) item that has a visual for that gender, with the
 * jumpsuit pinned to the front, then alphabetical by display name. Each entry is a
 * real DwellerOutfitItem, so its `id` is a valid save value (variants like
 * HandymanJumpsuit_Advanced appear as separate entries).
 */
function visibleOutfits(index: SpriteIndex, gender: Gender): OutfitItem[] {
  const items = equippableOutfits(index, gender);
  const rank = (o: OutfitItem) => (o.id === VAULT_DEFAULT_OUTFIT ? 0 : 1);
  return [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

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

  // Debounce so the thumbnail grid only rebuilds after the color picker settles.
  const debouncedSkinKey = useDebouncedValue(skinKey, 250);

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
      const outfits = visibleOutfits(index, gender);
      const newMap = new Map<string, string>();

      for (const outfit of outfits) {
        if (cancelled) break;
        // Build a temporary dweller wearing this outfit item, no hair/face
        const tempDweller: RenderableDweller = {
          ...dweller,
          outfitName: outfit.id,
          hairName: undefined,
          facialHair: undefined, // no beard/mustache on outfit thumbnails
          happinessValue: undefined, // no face expression
        };
        // buildLayers then filter to body + outfit only (no face/hair/facial hair).
        // Pass largeHeadgear meshes so outfits with hats (Bishop mitre, Mayor top
        // hat, …) render their headgear in the thumbnail too.
        const layers = buildLayers(tempDweller, index, offsets, {
          largeHeadgear: meshSet.largeHeadgear,
        }).filter(
          (l) => l.slot !== 'face' && l.slot !== 'hair' && l.slot !== 'faceMask',
        );
        const withImages = await Promise.all(
          layers.map(async (l) => ({
            ...l,
            image: await loadAtlas(l.atlas),
            maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
          })),
        );
        if (cancelled) break;
        rendererRef.current!.draw(mesh, withImages);
        newMap.set(outfit.id, canvasRef.current!.toDataURL());
      }

      if (!cancelled) setThumbnails(new Map(newMap));
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, gender, debouncedSkinKey]);

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

  const gender: Gender = dweller.gender === 2 ? 'male' : 'female';
  const thumbnails = useOutfitThumbnails(index, meshSet, dweller);

  const options = visibleOutfits(index, gender).map((o) => {
    const thumbnailUrl = thumbnails.get(o.id);
    return {
      value: o.id,
      label: o.name,
      thumbnailUrl,
      // Show a skeleton placeholder until the offscreen thumbnail finishes rendering.
      loading: !thumbnailUrl,
      badge: <SpecialBadges bonus={o.special ?? {}} />,
    };
  });

  return (
    <OptionGrid
      options={options}
      selected={dweller.outfitName ?? null}
      onSelect={(v) => onChange({ outfitId: v })}
    />
  );
}
