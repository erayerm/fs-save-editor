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
        'absolute top-1 right-1 z-10 cursor-pointer transition-opacity ' +
        (active ? 'opacity-100' : 'opacity-0 grayscale group-hover:opacity-70')
      }
    >
      <img src="/vault-boy-fav.png" alt="" width={28} height={28} draggable={false} />
    </span>
  );
}
