import { useState, useEffect, useRef, useMemo } from 'react';
import { OptionGrid, type GridOption } from './OptionGrid';
import { SpecialBadges } from './SpecialBadges';
import { equippableOutfits, outfitItemById, outfitValidForGender } from '../../lib/spriteIndex';
import { specialBonusFor } from '../../lib/outfitStats';
import { DEFAULT_OUTFIT_ID } from '../../lib/stash';
import { useGearSource, useStashGear } from '../../lib/useStashGear';
import { useSaveStore } from '../../store/saveStore';
import { humanizeId } from '../StashItemInfo';
import { StashCornerChip } from './StashCornerChip';
import { StashViewHeader } from './StashViewHeader';
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
import { UnknownItemCard } from './UnknownItemCard';
import { useUnknownItemGuard } from './UnknownItemModal';
import { useFavorites } from '../../lib/useFavorites';

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

/** Render thumbnails of outfit ids `ids` via a single shared offscreen WebGL canvas. */
function useOutfitThumbnails(
  index: SpriteIndex,
  meshSet: DwellerMeshSet | null,
  dweller: RenderableDweller,
  ids: string[],
): Map<string, string> {
  const gender: Gender = dweller.gender === 2 ? 'male' : 'female';
  const skinKey = rgbKey(dweller.skinColor);
  const outfitKey = rgbKey(dweller.outfitColor);
  const idsKey = ids.join('\n');

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
    for (const id of ids) {
      const hit = outfitThumbCache.get(thumbKey(gender, id, skinKey, outfitKey));
      if (hit) m.set(id, hit);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, gender, skinKey, outfitKey, version]);

  useEffect(() => {
    if (!meshSet) return;
    let cancelled = false;

    (async () => {
      const mesh = meshSet[gender].adult;
      const offsets = meshSet[gender].offsets;
      const sk = debouncedSkinKey;
      const ok = debouncedOutfitKey;

      let sinceYield = 0;
      let renderedAny = false;
      for (const outfitId of ids) {
        if (cancelled) break;
        const key = thumbKey(gender, outfitId, sk, ok);
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
          outfitName: outfitId,
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
  }, [index, meshSet, gender, idsKey, debouncedSkinKey, debouncedOutfitKey]);

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
  const [source, setSource] = useGearSource('outfit');
  const stash = useStashGear('Outfit');
  const equipFromStash = useSaveStore((s) => s.equipSelectedFromStash);

  // The equipped outfit is unknown when its id isn't a known outfit item
  // (content added to the game after this editor's last update).
  const outfitName = dweller.outfitName;
  const known = !outfitName || outfitItemById(index, outfitName) != null;
  const { isUnknown, openInfo, guardSelect, modal } = useUnknownItemGuard(outfitName, known);
  const { favorites, toggle } = useFavorites('outfit');

  // Stash outfits can be any rarity (not just the Premium ones the Global view
  // lists), and some have no art for this dweller's gender.
  const stashed = stash.groups.map((g) => {
    const id = g.item.id;
    const item = outfitItemById(index, id);
    return {
      group: g,
      id,
      name: item?.name ?? humanizeId(id),
      special: item?.special ?? specialBonusFor(id),
      renderable: outfitValidForGender(index, id, gender),
      wrongGender: !!item && !outfitValidForGender(index, id, gender),
    };
  });

  const global = source === 'global' ? visibleOutfits(index, gender) : [];
  const thumbIds = useMemo(
    () => source === 'global'
      ? global.map((o) => o.id)
      : [
          ...(outfitName && known ? [outfitName] : []),
          ...stashed.filter((s) => s.renderable).map((s) => s.id),
        ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, index, gender, outfitName, known, stash.groups],
  );
  const thumbnails = useOutfitThumbnails(index, meshSet, dweller, thumbIds);

  // With a SPECIAL stat: filter+sort by that stat. Without one but with a sort
  // direction: sort by the sum of all SPECIAL bonuses. Otherwise: default order.
  const filterAndSort = <T extends { name: string; special?: OutfitItem['special'] }>(items: T[]) => {
    const searched = filterByText(items, query, (o) => o.name);
    return stat ? filterAndSortOutfits(searched, stat, dir) : sortBySpecialTotal(searched, dir);
  };

  const portrait = (id: string) => {
    const thumbnailUrl = thumbnails.get(id);
    // Show a skeleton placeholder until the offscreen thumbnail finishes rendering.
    return { thumbnailUrl, loading: !thumbnailUrl };
  };

  const globalOptions: GridOption[] = filterAndSort(global).map((o) => {
    const inStash = stash.countById.get(o.id) ?? 0;
    return {
      value: o.id,
      label: o.name,
      ...portrait(o.id),
      badge: <SpecialBadges bonus={o.special ?? {}} />,
      corner: inStash > 0 ? <StashCornerChip>In stash ×{inStash}</StashCornerChip> : undefined,
      title: inStash ? `${o.name} (${inStash} in stash; picking it here adds a new one)` : o.name,
    };
  });

  const stashMatches = filterAndSort(stashed);
  const stashOptions: GridOption[] = stashMatches.map((s) => ({
    value: s.group.key,
    label: s.name,
    ...(s.renderable ? portrait(s.id) : {}),
    badge: <SpecialBadges bonus={s.special} />,
    corner: <StashCornerChip count={s.group.indices.length} />,
    disabled: s.wrongGender,
    note: s.wrongGender
      ? `${gender === 'male' ? 'Female' : 'Male'} only`
      : s.renderable ? undefined : 'No preview',
    title: s.wrongGender
      ? `${s.name} can't be worn by ${gender} dwellers`
      : `Equip ${s.name} from the stash (swaps with the equipped outfit)`,
  }));

  const equipped = outfitName ?? DEFAULT_OUTFIT_ID;
  const equippedItem = outfitItemById(index, equipped);
  const equippedThumb = thumbnails.get(equipped);

  const onSelect = (v: string) => {
    if (source === 'global') return guardSelect(() => onChange({ outfitId: v }));
    const s = stashed.find((x) => x.group.key === v);
    if (s) equipFromStash(s.group.indices[0]);
  };

  const unknownCard = isUnknown && outfitName
    ? <UnknownItemCard id={outfitName} width={170} height={268} onWarn={openInfo} />
    : undefined;

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
        source={source}
        onSourceChange={setSource}
        stashCount={stash.count}
      />
      {source === 'global' ? (
        <OptionGrid
          options={globalOptions}
          selected={outfitName ?? null}
          onSelect={onSelect}
          showLabel
          favorites={favorites}
          onToggleFavorite={toggle}
          leading={unknownCard}
        />
      ) : (
        <>
          <StashViewHeader
            name={isUnknown ? equipped : equippedItem?.name ?? humanizeId(equipped)}
            icon={equippedThumb
              ? <img src={equippedThumb} alt="" className="max-w-full max-h-full object-contain" />
              : !isUnknown && <div className="w-full h-full rounded bg-zinc-700/40 animate-pulse" />}
            detail={<SpecialBadges bonus={equippedItem?.special ?? specialBonusFor(equipped)} inline />}
            warning={isUnknown ? 'Not recognized by this editor' : undefined}
            onUnequip={equipped !== DEFAULT_OUTFIT_ID
              ? () => guardSelect(() => onChange({ outfitId: DEFAULT_OUTFIT_ID }))
              : undefined}
          />
          {stashOptions.length === 0 ? (
            <div className="px-2 py-2 text-sm text-zinc-500">
              {stash.count === 0 ? 'No outfits in the stash.' : 'No stashed outfits match.'}
            </div>
          ) : (
            <OptionGrid options={stashOptions} selected={null} onSelect={onSelect} showLabel />
          )}
        </>
      )}
      {modal}
    </div>
  );
}
