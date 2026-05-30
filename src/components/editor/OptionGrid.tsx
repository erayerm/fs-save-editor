import React from 'react';
import { SpriteCanvas, type SpriteLayer } from './SpriteCanvas';

export interface GridOption {
  value: string;
  label: string;
  /** Pre-rendered data URL (e.g. from offscreen WebGL). */
  thumbnailUrl?: string;
  /** Sprite layer(s) composited on a canvas (with optional tint). */
  layers?: SpriteLayer[];
  /** Optional badge node rendered as an overlay at the bottom of the cell. */
  badge?: React.ReactNode;
}

export function OptionGrid({
  options, selected, onSelect, cellW, cellH,
}: {
  options: GridOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** Override cell width (px). Default: 170 for thumbnailUrl, 80 for sprite layers. */
  cellW?: number;
  /** Override cell height (px). Default: 221 for thumbnailUrl, 80 for sprite layers. */
  cellH?: number;
}) {
  if (options.length === 0) {
    return <div className="text-zinc-500 italic text-sm p-2">No options available.</div>;
  }

  const hasPortrait = options.some((o) => o.thumbnailUrl);
  const hasSprite = options.some((o) => o.layers && o.layers.length > 0);

  const cellClass = 'rounded border flex items-center justify-center overflow-hidden flex-shrink-0 ';
  const cellStyle = hasPortrait
    ? { width: cellW ?? 170, height: cellH ?? 221 }
    : hasSprite
    ? { width: cellW ?? 80, height: cellH ?? 80 }
    : { minWidth: cellW ?? 80, minHeight: cellH ?? 48 };

  return (
    <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[600px] p-1 content-start">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.label}
          aria-pressed={o.value === selected}
          onClick={() => onSelect(o.value)}
          className={
            cellClass +
            (o.value === selected
              ? 'border-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-400'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500')
          }
          style={{ ...cellStyle, position: 'relative' }}
        >
          {o.thumbnailUrl ? (
            <img
              src={o.thumbnailUrl}
              alt={o.label}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', imageRendering: 'auto' }}
            />
          ) : o.layers && o.layers.length > 0 ? (
            <SpriteCanvas layers={o.layers} size={72} />
          ) : (
            <span className="text-xs text-zinc-300 text-center px-1 leading-tight">{o.label}</span>
          )}
          {o.badge && (
            <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              {o.badge}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
