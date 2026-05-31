/**
 * Canvas-based sprite thumbnail with optional multiply tinting and layer compositing.
 * Unity atlases use Y-from-bottom; we flip to canvas Y-from-top.
 */
import { useRef, useEffect } from 'react';
import { loadAtlas } from '../../lib/atlasLoader';
import type { AtlasRect } from '../../types/pieces';
import type { Rgb } from '../../lib/dwellerRender';

const ATLAS_SIZE = 1024;

export interface SpriteLayer {
  atlas: string;
  bounds: AtlasRect;
  /** Multiply-tint applied to this layer (preserves alpha). */
  tint?: Rgb;
}

export function SpriteCanvas({ layers, size = 72 }: { layers: SpriteLayer[]; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas) return;

    (async () => {
      const imgs = await Promise.all(layers.map((l) => loadAtlas(l.atlas)));
      if (cancelled) return;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, size, size);

      for (let i = 0; i < layers.length; i++) {
        const { atlas: _a, bounds, tint } = layers[i];
        const img = imgs[i];
        const { x, y, w, h } = bounds;
        // Unity stores Y from bottom → flip to canvas Y-from-top
        const srcY = ATLAS_SIZE - y - h;

        if (tint) {
          // Draw to temp canvas, multiply-tint, then composite onto main
          const off = document.createElement('canvas');
          off.width = size;
          off.height = size;
          const oc = off.getContext('2d')!;
          oc.drawImage(img, x, srcY, w, h, 0, 0, size, size);
          oc.globalCompositeOperation = 'multiply';
          oc.fillStyle = `rgb(${tint.r},${tint.g},${tint.b})`;
          oc.fillRect(0, 0, size, size);
          // Restore alpha from original sprite
          oc.globalCompositeOperation = 'destination-in';
          oc.drawImage(img, x, srcY, w, h, 0, 0, size, size);
          ctx.drawImage(off, 0, 0);
        } else {
          ctx.drawImage(img, x, srcY, w, h, 0, 0, size, size);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [layers, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}
