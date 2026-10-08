import { useEffect, useState } from 'react';
import { loadWeaponIndex, weaponById } from '../lib/weaponIndex';
import { SpriteCrop } from './SpriteCrop';
import { useSaveStore } from '../store/saveStore';
import type { WeaponIndex } from '../types/weapons';

/**
 * Small overlay shown in the bottom-right corner of the dweller portrait,
 * displaying the equipped weapon's name and damage range.
 */
export function WeaponBadge({ onSelect }: { onSelect?: () => void }) {
  const [index, setIndex] = useState<WeaponIndex | null>(null);
  const equippedId = useSaveStore((s) => s.getSelectedDweller()?.equipedWeapon?.id);

  useEffect(() => {
    let alive = true;
    loadWeaponIndex().then((idx) => { if (alive) setIndex(idx); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!index || !equippedId) return null;
  const meta = weaponById(index, equippedId);
  if (!meta) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Weapon: ${meta.name}. Open weapon tab`}
      className="ml-auto max-w-full min-w-0 flex items-center gap-2 rounded bg-zinc-900/85 border border-zinc-700 px-2 py-1 leading-tight shadow-lg transition-colors hover:border-green-500 hover:bg-zinc-800/90 focus-visible:outline-none focus-visible:border-green-500"
    >
      {meta.icon && (
        <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
          <SpriteCrop rect={meta.icon} size={40} title={meta.name} />
        </div>
      )}
      <div className="text-right min-w-0">
        <div className="text-green-400 font-medium truncate" style={{ fontSize: 12 }} title={meta.name}>{meta.name}</div>
        <div className="text-zinc-300 font-mono" style={{ fontSize: 11 }}>
          {meta.damageMin}-{meta.damageMax} DMG
        </div>
      </div>
    </button>
  );
}
