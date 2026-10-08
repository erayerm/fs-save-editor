import type React from 'react';

/**
 * Auto-filling picker grid whose columns stretch to use the full row width.
 * Tiles may shrink to `minScale` of their design width before a column is
 * dropped, so the row never ends in a wide empty gap.
 */
export function fluidGridStyle(tileW: number, minScale = 0.8): React.CSSProperties {
  const min = Math.round(tileW * minScale);
  return { gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` };
}

/** Tile that fills its grid column and keeps its design aspect ratio. */
export function fluidTileStyle(w: number, h: number): React.CSSProperties {
  return { width: '100%', aspectRatio: `${w} / ${h}` };
}
