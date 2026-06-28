import React from 'react';

/**
 * Vault Boy favorite marker, rendered as an overlay inside an item cell.
 *
 * Cells are <button>s, so this MUST NOT be a nested <button> (invalid HTML). It is a
 * role="button" span that stops propagation, so toggling a favorite never selects the
 * item. Desaturated + hover-revealed when inactive; full-color + always-visible when
 * active. Relies on the parent cell carrying the `group` class for hover reveal.
 */
export function FavoriteToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const activate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') activate(e); }}
      className={
        // No z-index: the marker still paints above its (in-flow) cell image, but
        // stays BELOW the sticky filter/color bars (which sit at z-10).
        'absolute top-1 right-1 cursor-pointer transition-opacity ' +
        (active ? 'opacity-100' : 'opacity-0 grayscale group-hover:opacity-70')
      }
    >
      {/* Vault Boy fitted inside a bordered circular badge (outer ring). */}
      <span className="block w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-50 shadow">
        <img
          src="/vault-boy-fav.png"
          alt=""
          draggable={false}
          className="w-full h-full object-contain"
        />
      </span>
    </span>
  );
}
