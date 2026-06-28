import React from 'react';
import { SpriteCanvas, type SpriteLayer } from './SpriteCanvas';
import { pinFavorites } from '../../lib/useFavorites';
import { FavoriteToggle } from './FavoriteToggle';

export interface GridOption {
  value: string;
  label: string;
  /** Pre-rendered data URL (e.g. from offscreen WebGL). */
  thumbnailUrl?: string;
  /** Sprite layer(s) composited on a canvas (with optional tint). */
  layers?: SpriteLayer[];
  /** Optional badge node rendered as an overlay at the bottom of the cell. */
  badge?: React.ReactNode;
  /**
   * Portrait thumbnail is still rendering. Shows a skeleton placeholder (sized
   * like a portrait cell) instead of the label-text fallback, so the grid doesn't
   * flash key names or jump layout while offscreen rendering catches up.
   */
  loading?: boolean;
}

export function OptionGrid({
  options, selected, onSelect, cellW, cellH, showLabel = false, leading, favorites, onToggleFavorite,
}: {
  options: GridOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** Optional node pinned as the first cell of the grid (e.g. an unknown-item card). */
  leading?: React.ReactNode;
  /** Override cell width (px). Default: 170 for thumbnailUrl, 80 for sprite layers. */
  cellW?: number;
  /** Override cell height (px). Default: 221 for thumbnailUrl, 80 for sprite layers. */
  cellH?: number;
  /**
   * Portrait cells only: show the option's name below the thumbnail (with a
   * fixed-height SPECIAL badge row beneath it). Used by the outfit picker, whose
   * labels are real names; left off for e.g. hair, whose labels are bare ids
   * ("01", "02") that shouldn't be shown.
   */
  showLabel?: boolean;
  /** Ordered favorite ids for this picker's category. When provided with
   *  onToggleFavorite, favorited cells show a Vault Boy marker and pin to the front. */
  favorites?: string[];
  onToggleFavorite?: (value: string) => void;
}) {
  if (options.length === 0 && !leading) {
    return <div className="text-zinc-500 italic text-sm p-2">No options available.</div>;
  }

  // `loading` cells are portrait placeholders, so treat them as portrait too —
  // this keeps the grid at portrait width/height from the first paint (no jump).
  const hasPortrait = options.some((o) => o.thumbnailUrl || o.loading);
  const hasSprite = options.some((o) => o.layers && o.layers.length > 0);

  const favEnabled = !!favorites && !!onToggleFavorite;
  const displayOptions = favEnabled
    ? pinFavorites(options, (o) => o.value, favorites!)
    : options;

  // Portrait cells stack the image and badge vertically (with a gap between them);
  // other cells just center their content.
  const cellClass =
    (favEnabled ? 'group ' : '') +
    'rounded border overflow-hidden ' +
    (hasPortrait ? 'flex flex-col items-center ' : 'flex items-center justify-center ');
  const cellStyle = hasPortrait
    ? { width: cellW ?? 170, height: cellH ?? 268 }
    : hasSprite
    ? { width: cellW ?? 80, height: cellH ?? 80 }
    : { minWidth: cellW ?? 80, minHeight: cellH ?? 48 };

  // Column width drives an auto-filling responsive grid: as many fixed-width
  // columns as fit, with the remaining space distributed evenly between them.
  // This keeps every row (including the last) aligned to the same columns.
  const colW = hasPortrait ? cellW ?? 170 : (cellW ?? 80);

  return (
    <div
      className="grid gap-1.5 p-1 justify-between"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${colW}px)` }}
    >
      {leading}
      {displayOptions.map((o) => (
        <button
          key={o.value}
          title={o.label}
          aria-pressed={o.value === selected}
          onClick={() => onSelect(o.value)}
          className={
            cellClass +
            (o.value === selected
              ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500')
          }
          style={{ ...cellStyle, position: 'relative' }}
        >
          {favEnabled && (
            <FavoriteToggle
              active={favorites!.includes(o.value)}
              onToggle={() => onToggleFavorite!(o.value)}
            />
          )}
          {o.thumbnailUrl || o.loading ? (
            // Portrait: image (or skeleton) fills the flexible top region. With
            // showLabel, the option name is shown right beneath the image and a
            // FIXED-height SPECIAL badge row follows (reserving the height keeps
            // cells with and without a badge — e.g. the jumpsuit — aligned).
            <>
              <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: showLabel ? 'flex-end' : 'center', justifyContent: 'center', padding: o.thumbnailUrl ? 0 : 10 }}>
                {o.thumbnailUrl ? (
                  <img
                    src={o.thumbnailUrl}
                    alt={o.label}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', imageRendering: 'auto' }}
                  />
                ) : (
                  <div className="w-full h-full rounded-md bg-zinc-700/40 animate-pulse" />
                )}
              </div>
              {showLabel ? (
                <>
                  {/* Name hugs the outfit above; a larger gap separates it from the SPECIAL row below. */}
                  <div className="w-full px-1 text-center text-[11px] font-medium text-zinc-200 truncate" style={{ paddingTop: 2 }}>
                    {o.label}
                  </div>
                  <div style={{ height: 42, marginTop: 12, paddingBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {o.thumbnailUrl
                      ? (o.badge ?? null)
                      : <div className="h-3 w-16 rounded bg-zinc-700/40 animate-pulse" />}
                  </div>
                </>
              ) : o.thumbnailUrl && o.badge ? (
                <div style={{ paddingTop: 4, paddingBottom: 8, display: 'flex', justifyContent: 'center' }}>{o.badge}</div>
              ) : null}
            </>
          ) : o.layers && o.layers.length > 0 ? (
            <SpriteCanvas layers={o.layers} size={72} />
          ) : (
            <span className="text-xs text-zinc-300 text-center px-1 leading-tight">{o.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}
