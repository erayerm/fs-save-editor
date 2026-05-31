import { useState, useEffect, useRef } from 'react';
import { OptionGrid } from './OptionGrid';
import { SpecialBadges } from './SpecialBadges';
import { specialBonusFor } from '../../lib/outfitStats';
import { piecesOfType } from '../../lib/spriteIndex';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { loadMeshSet } from '../../lib/meshLoader';
import { loadAtlas } from '../../lib/atlasLoader';
import { buildLayers } from '../../lib/dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer } from '../../lib/dwellerWebGL';
import type { SpriteIndex, Gender, PieceRef } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { DwellerMeshSet } from '../../types/mesh';

const THUMB_SIZE = 340; // offscreen WebGL canvas — 2× cell width (170px) for crisp display

// EOutfitCategory.Premium — the only category that is a real, obtainable player
// item. Other categories are enemy/scripted (CodeControlled), basic Casual, or
// the default vault suit. See scripts/build-sprite-index.mjs for tagging.
const PREMIUM_CATEGORY = 2;
// The default vault outfit (GameParameters m_vaultDefaultOutfit). It's category 3
// (Default), so it's normally filtered out, but we keep it as an explicit
// exception and pin it to the top of the list.
const VAULT_DEFAULT_OUTFIT = 'jumpsuit';

/**
 * The outfits to show in the picker: real player items (Premium category) plus
 * the default vault suit (jumpsuit) pinned to the front. Enemy/scripted outfits
 * (Scorched, Gen1Synth, alien_space_suit_enemy, …) are excluded.
 */
function visibleOutfits(index: SpriteIndex, gender: Gender): PieceRef[] {
  const all = piecesOfType(index, 'outfit', { gender });
  const jumpsuits = all.filter((p) => p.name === VAULT_DEFAULT_OUTFIT);
  const premium = all.filter(
    (p) => p.name !== VAULT_DEFAULT_OUTFIT && p.flags.outfitCategory === PREMIUM_CATEGORY,
  );
  return [...jumpsuits, ...premium];
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
        // Build a temporary dweller with this outfit, no hair/face
        const tempDweller: RenderableDweller = {
          ...dweller,
          outfitName: outfit.name,
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
        newMap.set(outfit.name, canvasRef.current!.toDataURL());
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

  const gender = dweller.gender === 2 ? 'male' : 'female';
  const thumbnails = useOutfitThumbnails(index, meshSet, dweller);

  const options = visibleOutfits(index, gender).map((p) => ({
    value: p.name,
    label: p.name,
    thumbnailUrl: thumbnails.get(p.name),
    badge: <SpecialBadges bonus={p.special ?? specialBonusFor(p.name)} />,
  }));

  return (
    <OptionGrid
      options={options}
      selected={dweller.outfitName ?? null}
      onSelect={(v) => onChange({ outfitId: v })}
    />
  );
}
