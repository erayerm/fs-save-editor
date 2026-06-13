import { useEffect, useRef, useState } from 'react';
import { loadWeaponIndex } from '../../lib/weaponIndex';
import { SpriteCrop } from '../SpriteCrop';
import { setWeapon } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { WeaponIndex } from '../../types/weapons';
import type { RenderableDweller } from '../../lib/dwellerRender';
import { SortFilterBar } from './SortFilterBar';
import { sortByDamage, type SortDir } from '../../lib/pickerSort';

export function WeaponTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [weaponIndex, setWeaponIndex] = useState<WeaponIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return d?.equipedWeapon?.id;
  });

  const [dir, setDir] = useState<SortDir>('desc');

  useEffect(() => {
    unmounted.current = false;
    loadWeaponIndex().then((idx) => {
      if (!unmounted.current) setWeaponIndex(idx);
    });
    return () => { unmounted.current = true; };
  }, []);

  if (!weaponIndex) {
    return <div className="text-zinc-400 text-sm">Loading weapons…</div>;
  }

  const DEFAULT_WEAPON = 'Fist';
  const all = Object.entries(weaponIndex.weapons).map(([id, meta]) => ({ id, ...meta }));
  const def = all.filter((w) => w.id === DEFAULT_WEAPON);
  const rest = sortByDamage(all.filter((w) => w.id !== DEFAULT_WEAPON), dir);
  const entries: [string, typeof all[number]][] = [...def, ...rest].map((w) => [w.id, w]);

  return (
    <div className="pt-4">
      <SortFilterBar mode="weapon" dir={dir} onDirChange={setDir} />
      <div
        className="grid gap-1.5 p-1 justify-between"
        style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}
      >
        {entries.map(([id, meta]) => {
          const isEquipped = id === equippedId;
          return (
            <button
              key={id}
              title={meta.name}
              aria-pressed={isEquipped}
              onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => setWeapon(d, id))}
              className={[
                'rounded border flex flex-col items-center overflow-hidden transition-colors',
                isEquipped
                  ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400'
                  : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
              ].join(' ')}
              style={{ width: 170, height: 170 }}
            >
              <div className="flex-1 flex items-center justify-center w-full">
                {meta.icon
                  ? <SpriteCrop rect={meta.icon} size={104} title={meta.name} />
                  : <div className="w-16 h-16" />}
              </div>
              <div className="w-full px-1 pb-1 text-center leading-tight">
                <div className="text-xs font-medium text-zinc-100 truncate">{meta.name}</div>
                <div className="text-[11px] text-zinc-400">{meta.damageMin}-{meta.damageMax}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
