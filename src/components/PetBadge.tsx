import { useEffect, useState } from 'react';
import { loadPetIndex } from '../lib/petIndex';
import { SpriteCrop } from './SpriteCrop';
import { useSaveStore } from '../store/saveStore';
import type { PetIndex } from '../types/pets';

/**
 * Small overlay shown in the bottom-right corner of the dweller portrait (above
 * the weapon badge), displaying the equipped pet's breed, rarity and bonus.
 */
export function PetBadge({ onSelect }: { onSelect?: () => void }) {
  const [index, setIndex] = useState<PetIndex | null>(null);
  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return (d as { equippedPet?: { id?: string } } | null)?.equippedPet?.id;
  });

  useEffect(() => {
    let alive = true;
    loadPetIndex().then((idx) => { if (alive) setIndex(idx); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!index || !equippedId) return null;
  const meta = index.pets[equippedId];
  if (!meta) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Pet: ${meta.name}. Open pet tab`}
      className="ml-auto max-w-full min-w-0 flex items-center gap-2 rounded bg-zinc-900/85 border border-zinc-700 px-2 py-1 leading-tight shadow-lg transition-colors hover:border-green-500 hover:bg-zinc-800/90 focus-visible:outline-none focus-visible:border-green-500"
    >
      {meta.icon && (
        <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
          <SpriteCrop rect={meta.icon} size={40} title={meta.name} />
        </div>
      )}
      <div className="text-right min-w-0">
        <div className="text-green-400 font-medium truncate" style={{ fontSize: 12 }} title={meta.name}>
          {meta.name} <span className="text-zinc-400 font-normal">· {meta.rarity}</span>
        </div>
        <div className="text-zinc-300 truncate" style={{ fontSize: 11 }} title={meta.bonusLabel}>
          {meta.bonusLabel}
        </div>
      </div>
    </button>
  );
}
