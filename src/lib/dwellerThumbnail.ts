// Shared offscreen dweller-thumbnail renderer.
//
// Why this exists: rendering each footer/card avatar with its own <canvas> +
// WebGL context quickly exhausts the browser's ~16-context limit ("Too many
// active WebGL contexts. Oldest context will be lost"), which made footer
// avatars vanish one by one. Instead we keep ONE shared offscreen WebGL
// renderer, draw each dweller into it serially, and snapshot the result to a
// data-URL that callers display in a plain <img>. <img> elements are cheap and
// unlimited.

import { loadSpriteIndex } from './spriteIndex';
import { loadAtlas } from './atlasLoader';
import { loadMeshSet } from './meshLoader';
import { buildLayersWithMeta } from './dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer, type RendererLayerInput } from './dwellerWebGL';
import type { RenderableDweller } from './dwellerRender';

const THUMB_SIZE = 256;

let canvas: HTMLCanvasElement | null = null;
let renderer: DwellerRenderer | null = null;

function getRenderer(): { renderer: DwellerRenderer; canvas: HTMLCanvasElement } {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
  }
  if (!renderer) {
    renderer = createDwellerRenderer(canvas);
  }
  return { renderer, canvas };
}

/** Stable cache key from everything that affects a dweller's rendered appearance. */
export function thumbnailKey(d: RenderableDweller): string {
  const c = (col?: { r: number; g: number; b: number }) => (col ? `${col.r},${col.g},${col.b}` : '-');
  return [
    d.gender,
    d.isChild ? 'child' : 'adult',
    d.hairName ?? '-',
    d.facialHair ?? '-',
    d.outfitName ?? '-',
    d.happinessValue ?? '-',
    c(d.skinColor),
    c(d.hairColor),
    c(d.outfitColor),
  ].join('|');
}

const cache = new Map<string, string>();

// Serialize renders: a single shared canvas can only draw one dweller at a time.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Render a dweller to a PNG data-URL, reusing the shared renderer. Results are
 * cached by appearance key, so repeated/identical dwellers cost nothing.
 * Returns null for child dwellers (not customizable / not rendered).
 */
export function renderDwellerThumbnail(dweller: RenderableDweller): Promise<string | null> {
  if (dweller.isChild) return Promise.resolve(null);
  const key = thumbnailKey(dweller);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const run = queue.then(async () => {
    const hit = cache.get(key);
    if (hit) return hit;
    const [index, meshSet] = await Promise.all([loadSpriteIndex(), loadMeshSet()]);
    const { renderer: r, canvas: cv } = getRenderer();
    const gender = dweller.gender === 2 ? 'male' : 'female';
    const mesh = meshSet[gender].adult;
    const offsets = meshSet[gender].offsets;
    const { layers } = buildLayersWithMeta(dweller, index, offsets, {
      largeHeadgear: meshSet.largeHeadgear,
    });
    const withImages: RendererLayerInput[] = await Promise.all(
      layers.map(async (l) => ({
        ...l,
        image: await loadAtlas(l.atlas),
        maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
      })),
    );
    r.draw(mesh, withImages);
    const url = cv.toDataURL();
    cache.set(key, url);
    return url;
  });

  // Keep the queue chain alive even if one render rejects.
  queue = run.catch(() => undefined);
  return run;
}

const outfitCache = new Map<string, string>();

/**
 * Render just the dweller's body + equipped outfit (no face/hair/facial hair) to
 * a PNG data-URL, reusing the shared renderer. Used by the outfit badge.
 * Returns null for child dwellers or when no outfit is equipped.
 */
export function renderOutfitThumbnail(dweller: RenderableDweller): Promise<string | null> {
  if (dweller.isChild || !dweller.outfitName) return Promise.resolve(null);
  const gender = dweller.gender === 2 ? 'male' : 'female';
  const c = (col?: { r: number; g: number; b: number }) => (col ? `${col.r},${col.g},${col.b}` : '-');
  const key = `${gender}|${dweller.outfitName}|${c(dweller.skinColor)}|${c(dweller.outfitColor)}`;
  const cached = outfitCache.get(key);
  if (cached) return Promise.resolve(cached);

  const run = queue.then(async () => {
    const hit = outfitCache.get(key);
    if (hit) return hit;
    const [index, meshSet] = await Promise.all([loadSpriteIndex(), loadMeshSet()]);
    const { renderer: r, canvas: cv } = getRenderer();
    const mesh = meshSet[gender].adult;
    const offsets = meshSet[gender].offsets;
    const temp: RenderableDweller = {
      ...dweller,
      hairName: undefined,
      facialHair: undefined,
      happinessValue: undefined,
    };
    const { layers } = buildLayersWithMeta(temp, index, offsets, {
      largeHeadgear: meshSet.largeHeadgear,
    });
    const outfitLayers = layers.filter(
      (l) => l.slot !== 'face' && l.slot !== 'hair' && l.slot !== 'faceMask',
    );
    const withImages: RendererLayerInput[] = await Promise.all(
      outfitLayers.map(async (l) => ({
        ...l,
        image: await loadAtlas(l.atlas),
        maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
      })),
    );
    r.draw(mesh, withImages);
    const url = cv.toDataURL();
    outfitCache.set(key, url);
    return url;
  });

  queue = run.catch(() => undefined);
  return run;
}
