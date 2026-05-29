import { useEffect, useRef, useState } from 'react';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { loadAtlas } from '../lib/atlasLoader';
import { buildDrawOps, type RenderableDweller, type DrawOp } from '../lib/dwellerRender';
import type { SpriteIndex } from '../types/pieces';

const W = 320;
const H = 320;

async function drawDweller(
  ctx: CanvasRenderingContext2D,
  ops: DrawOp[],
) {
  ctx.clearRect(0, 0, W, H);
  for (const op of ops) {
    const img = await loadAtlas(op.atlas);
    // Unity atlas Y is measured from the BOTTOM of the texture; canvas drawImage
    // measures from the TOP. Flip the source Y before drawing.
    const srcY = img.naturalHeight - op.src.y - op.src.h;
    if (!op.tint) {
      ctx.drawImage(img, op.src.x, srcY, op.src.w, op.src.h,
                          op.dst.x, op.dst.y, op.dst.w, op.dst.h);
      continue;
    }
    // Tint: draw to offscreen, fill with tint using multiply, restore alpha, then composite onto main canvas.
    const off = document.createElement('canvas');
    off.width = op.dst.w;
    off.height = op.dst.h;
    const offCtx = off.getContext('2d')!;
    offCtx.drawImage(img, op.src.x, srcY, op.src.w, op.src.h, 0, 0, op.dst.w, op.dst.h);
    offCtx.globalCompositeOperation = 'multiply';
    offCtx.fillStyle = `rgba(${op.tint.r}, ${op.tint.g}, ${op.tint.b}, ${op.tint.a})`;
    offCtx.fillRect(0, 0, op.dst.w, op.dst.h);
    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(img, op.src.x, srcY, op.src.w, op.src.h, 0, 0, op.dst.w, op.dst.h);
    ctx.drawImage(off, op.dst.x, op.dst.y);
  }
}

export function DwellerCanvas({ dweller }: { dweller: RenderableDweller | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpriteIndex().then(setIndex).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!index || !dweller) return;
    setError(null);  // clear stale error from previous dweller
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ops = buildDrawOps(dweller, index, { canvasW: W, canvasH: H });
    drawDweller(ctx, ops).catch((e) => setError(e.message));
  }, [index, dweller]);

  if (error) return <div className="text-red-400">Render error: {error}</div>;
  if (!dweller) return <div className="text-zinc-500 italic">No dweller selected.</div>;

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="bg-zinc-950 rounded border border-zinc-700"
    />
  );
}
