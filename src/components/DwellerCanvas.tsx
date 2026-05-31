import { useEffect, useRef, useState } from 'react';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { loadAtlas } from '../lib/atlasLoader';
import { loadMeshSet } from '../lib/meshLoader';
import { buildLayersWithMeta } from '../lib/dwellerLayers';
import { createDwellerRenderer, type DwellerRenderer, type RendererLayerInput } from '../lib/dwellerWebGL';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { SpriteIndex } from '../types/pieces';
import type { DwellerMeshSet } from '../types/mesh';

const W = 512;
const H = 512;

export function DwellerCanvas({
  dweller,
  size = 320,
  fill = false,
  onUnknownOutfit,
}: {
  dweller: RenderableDweller | null;
  size?: number;
  /** When true, fill the parent box (width/height 100%, contain) instead of a fixed square. */
  fill?: boolean;
  onUnknownOutfit?: (name: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DwellerRenderer | null>(null);
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [meshSet, setMeshSet] = useState<DwellerMeshSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadSpriteIndex(), loadMeshSet()])
      .then(([idx, ms]) => { setIndex(idx); setMeshSet(ms); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !index || !meshSet || !dweller) return;
    if (dweller.isChild) return;
    setError(null);

    let cancelled = false;
    (async () => {
      try {
        if (!rendererRef.current) rendererRef.current = createDwellerRenderer(canvas);
        const gender = dweller.gender === 2 ? 'male' : 'female';
        const mesh = meshSet[gender].adult;
        const offsets = meshSet[gender].offsets;
        const { layers, unknownOutfit } = buildLayersWithMeta(dweller, index, offsets, {
          largeHeadgear: meshSet.largeHeadgear,
        });
        onUnknownOutfit?.(unknownOutfit);
        const withImages: RendererLayerInput[] = await Promise.all(
          layers.map(async (l) => ({
            ...l,
            image: await loadAtlas(l.atlas),
            maskImage: l.coloringMask ? await loadAtlas(l.coloringMask.atlas) : undefined,
          })),
        );
        if (cancelled) return;
        rendererRef.current.draw(mesh, withImages);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [index, meshSet, dweller]);

  useEffect(() => () => { rendererRef.current?.dispose(); rendererRef.current = null; }, []);

  if (error) return <div className="text-red-400">Render error: {error}</div>;
  if (!dweller) return <div className="text-zinc-500 italic">No dweller selected.</div>;
  if (dweller.isChild) return <div className="text-zinc-400 italic">Child dweller (not customizable).</div>;

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={fill ? { width: '100%', height: '100%', objectFit: 'contain' } : { width: size, height: size }}
      className="bg-zinc-950 rounded border border-zinc-700"
    />
  );
}
