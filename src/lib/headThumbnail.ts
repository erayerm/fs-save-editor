// Shared offscreen head-thumbnail renderer for the Hair / Facial-hair pickers.
//
// Why this exists: the option grids show the same head rendered with each
// hair/beard piece. Those thumbnails depend only on gender + skin/hair colors +
// the piece (NOT on which dweller is selected), yet the per-tab renderers used
// to rebuild every thumbnail from scratch on every character change — wasteful,
// and each tab span its own WebGL context. This module keeps ONE shared
// offscreen renderer and a module-level cache keyed by appearance, so identical
// thumbnails are produced once and reused across dwellers and tab re-mounts.

import { loadAtlas } from './atlasLoader';
import { createDwellerRenderer, type DwellerRenderer, type ModelBounds, type RendererLayerInput } from './dwellerWebGL';
import type { RenderLayer } from './dwellerLayers';
import type { MeshGeometry } from '../types/mesh';

const THUMB_SIZE = 340;

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

const cache = new Map<string, string>();

// Serialize renders: a single shared canvas draws one head at a time.
let queue: Promise<unknown> = Promise.resolve();

/** Synchronous cache lookup, for rendering already-computed thumbnails immediately. */
export function getCachedHeadThumbnail(key: string): string | undefined {
  return cache.get(key);
}

/**
 * Render a head thumbnail for `key` using the shared renderer, caching the
 * result. If `key` is already cached, returns it without touching the GPU.
 * `layers` are atlas-relative layers (no images yet); atlases load lazily.
 */
export function renderHeadThumbnail(
  key: string,
  mesh: MeshGeometry,
  layers: RenderLayer[],
  bounds: ModelBounds,
): Promise<string> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const run = queue.then(async () => {
    const hit = cache.get(key);
    if (hit) return hit;
    const withImages: RendererLayerInput[] = await Promise.all(
      layers.map(async (l) => ({
        ...l,
        image: await loadAtlas(l.atlas),
        maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
      })),
    );
    const { renderer: r, canvas: cv } = getRenderer();
    r.draw(mesh, withImages, bounds);
    const url = cv.toDataURL();
    cache.set(key, url);
    return url;
  });

  // Keep the chain alive even if one render rejects.
  queue = run.catch(() => undefined);
  return run;
}
