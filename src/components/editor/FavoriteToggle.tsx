import React, { useId } from 'react';
import { FALLOUT_GREEN } from '../SpecialIcon';

// Classic heart silhouette (viewBox 0 0 24 24). Used as the favorite marker's outer
// shape — a heart is the universal "favorite" symbol.
const HEART_PATH =
  'M12 21.35 L10.55 20.03 C5.4 15.36 2 12.28 2 8.5 C2 5.42 4.42 3 7.5 3 ' +
  'C9.24 3 10.91 3.81 12 5.09 C13.09 3.81 14.76 3 16.5 3 C19.58 3 22 5.42 22 8.5 ' +
  'C22 12.28 18.6 15.36 13.45 20.04 L12 21.35 Z';

const SIZE = 24; // 2/3 of the original 36px badge

/**
 * Vault Boy favorite marker, rendered as an overlay inside an item cell.
 *
 * Cells are <button>s, so this MUST NOT be a nested <button> (invalid HTML). It is a
 * role="button" span that stops propagation, so toggling a favorite never selects the
 * item. The marker is a heart holding Vault Boy: inactive shows a gray line-art
 * silhouette on a neutral heart and is hover-revealed; active (favorited) shows the
 * full-color figure on a dark-green heart with a bright Fallout-green outline.
 * Relies on the parent cell carrying the `group` class for hover reveal.
 */
export function FavoriteToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  // Unique, selector-safe id so each cell's clipPath doesn't collide.
  const clipId = `fav-heart-${useId().replace(/:/g, '')}`;

  const activate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  const fill = active ? '#0b3d21' : '#27272a';
  const stroke = active ? FALLOUT_GREEN : '#71717a';
  const img = active ? '/vault-boy-fav.png' : '/vault-boy-fav-outline.png';

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
        'absolute top-1 right-1 cursor-pointer transition-opacity drop-shadow ' +
        (active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')
      }
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" className="block">
        <defs>
          <clipPath id={clipId}>
            <path d={HEART_PATH} />
          </clipPath>
        </defs>
        {/* Heart fill behind the figure */}
        <path d={HEART_PATH} fill={fill} />
        {/* Vault Boy fitted into the heart's upper region, clipped to the heart */}
        <image
          href={img}
          x="3.5"
          y="2"
          width="17"
          height="17"
          preserveAspectRatio="xMidYMid meet"
          clipPath={`url(#${clipId})`}
        />
        {/* Crisp heart outline on top */}
        <path d={HEART_PATH} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </span>
  );
}
