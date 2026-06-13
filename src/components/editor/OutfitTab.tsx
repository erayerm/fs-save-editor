import { useState, useEffect, useRef, useMemo } from 'react';
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
import { SortFilterBar } from './SortFilterBar';
import { filterAndSortOutfits, sortBySpecialTotal, filterByText, type SortDir, type SpecialKey } from '../../lib/pickerSort';

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

// Module-level cache, keyed by everything that affects an outfit thumbnail, so
// re-opening the Outfit tab (or revisiting a dweller) is instant instead of
// re-rendering ~165 thumbnails from scratch each time.
const outfitThumbCache = new Map<string, string>();
const rgbKey = (c?: { r: number; g: number; b: number }) =>
  c ? `${c.r},${c.g},${c.b}` : 'default';
const thumbKey = (gender: Gender, outfitId: string, skinKey: string, outfitKey: string) =>
  `${gender}|${outfitId}|${skinKey}|${outfitKey}`;

/** Render outfit thumbnails via a single shared offscreen WebGL canvas. */
function useOutfitThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
): Map<string, string> {
  const gender: Gender = dweller.gender === 2 ? 'male' : 'female';
  const skinKey = rgbKey(dweller.skinColor);
  const outfitKey = rgbKey(dweller.outfitColor);

  // Re-render whenever fresh thumbnails land in the cache.
  const [version, setVersion] = useState(0);
  const rendererRef = useRef<DwellerRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Debounce the EXPENSIVE render pass (effect) so dragging the color picker
  // doesn't rebuild ~165 thumbnails on every tick.
  const debouncedSkinKey = useDebouncedValue(skinKey, 250);
  const debouncedOutfitKey = useDebouncedValue(outfitKey, 250);

  // Displayed map is DERIVED from the cache for the CURRENT appearance (immediate
  // keys), not stored in state. So switching to an already-rendered dweller shows
  // instantly with no skeleton flash, and we never replace populated thumbnails
  // with an empty map (the cause of the post-switch flash). Only a genuinely new
  // appearance shows skeletons — and only until its thumbnails render in.
  const thumbnails = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of visibleOutfits(index, gender)) {
      const hit = outfitThumbCache.get(thumbKey(gender, o.id, skinKey, outfitKey));
      if (hit) m.set(o.id, hit);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, gender, skinKey, outfitKey, version]);

  useEffect(() => {
    if (!meshSet) return;
    let cancelled = false;

    (async () => {
      const mesh = meshSet[gender].adult;
      const offsets = meshSet[gender].offsets;
      const outfits = visibleOutfits(index, gender);
      const sk = debouncedSkinKey;
      const ok = debouncedOutfitKey;

      let sinceYield = 0;
      let renderedAny = false;
      for (const outfit of outfits) {
        if (cancelled) break;
        const key = thumbKey(gender, outfit.id, sk, ok);
        if (outfitThumbCache.has(key)) continue;

        // Create the offscreen canvas + renderer lazily — only when there's work,
        // so fully-cached re-opens never spin up a WebGL context.
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
          canvasRef.current.width = THUMB_SIZE;
          canvasRef.current.height = THUMB_SIZE;
        }
        if (!rendererRef.current) {
          rendererRef.current = createDwellerRenderer(canvasRef.current);
        }

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
        outfitThumbCache.set(key, canvasRef.current!.toDataURL());
        renderedAny = true;

        // Reveal in small batches and yield to the event loop so the tab stays
        // responsive (skeletons fill in progressively instead of one long freeze).
        if (++sinceYield >= 6) {
          sinceYield = 0;
          setVersion((v) => v + 1);
          await new Promise((r) => setTimeout(r, 0));
          if (cancelled) break;
        }
      }
      if (!cancelled && renderedAny) setVersion((v) => v + 1);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meshSet, gender, debouncedSkinKey, debouncedOutfitKey]);

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
  const [dir, setDir] = useState<SortDir>('default');
  const [query, setQuery] = useState('');
  const [stat, setStat] = useState<SpecialKey | null>(null);
  const thumbnails = useOutfitThumbnails(index, meshSet, dweller);

  const base = visibleOutfits(index, gender);
  const searched = filterByText(base, query, (o) => o.name);
  // With a SPECIAL stat: filter+sort by that stat. Without one but with a sort
  // direction: sort by the sum of all SPECIAL bonuses. Otherwise: default order.
  const ordered = stat
    ? filterAndSortOutfits(searched, stat, dir)
    : sortBySpecialTotal(searched, dir);
  const options = ordered.map((o) => {
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
    <div>
      <SortFilterBar
        mode="outfit"
        query={query}
        onQueryChange={setQuery}
        onReset={() => { setQuery(''); setDir('default'); setStat(null); }}
        dir={dir}
        onDirChange={setDir}
        stat={stat}
        onStatChange={setStat}
      />
      <OptionGrid
        options={options}
        selected={dweller.outfitName ?? null}
        onSelect={(v) => onChange({ outfitId: v })}
        showLabel
      />
    </div>
  );
}
