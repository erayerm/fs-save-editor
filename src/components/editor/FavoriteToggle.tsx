import React from 'react';
import { FALLOUT_GREEN } from '../SpecialIcon';

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
        (active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')
      }
    >
      {/* Vault Boy fitted inside a small circular badge. Inactive: gray line-art
          silhouette on a neutral badge. Active (favorited): full-color figure on a
          dark-green fill with a bright Fallout-green ring (two green tones). */}
      <span
        className="block w-[18px] h-[18px] rounded-full overflow-hidden border-2 shadow"
        style={
          active
            ? { borderColor: FALLOUT_GREEN, backgroundColor: '#0b3d21' }
            : { borderColor: '#71717a', backgroundColor: '#27272a' }
        }
      >
        <img
          src={active ? '/vault-boy-fav.png' : '/vault-boy-fav-outline.png'}
          alt=""
          draggable={false}
          className="w-full h-full object-contain"
        />
      </span>
    </span>
  );
}
