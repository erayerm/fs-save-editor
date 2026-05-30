import { useEffect, useRef, useState } from 'react';
import { loadWeaponIndex } from '../../lib/weaponIndex';
import { setWeapon } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { WeaponIndex } from '../../types/weapons';
import type { RenderableDweller } from '../../lib/dwellerRender';

export function WeaponTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [weaponIndex, setWeaponIndex] = useState<WeaponIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return d?.equipedWeapon?.id;
  });

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

  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(weaponIndex.weapons).map(([id, meta]) => {
        const isEquipped = id === equippedId;
        return (
          <button
            key={id}
            onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => setWeapon(d, id))}
            className={[
              'flex items-center gap-2 rounded px-3 py-2 text-sm text-left transition-colors',
              isEquipped
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
            ].join(' ')}
          >
            {meta.icon && <img src={'/weapons/' + meta.icon} alt={meta.name} className="w-6 h-6 object-contain" />}
            <span className="flex-1 font-medium">{meta.name}</span>
            <span className="text-xs opacity-75">{meta.damageMin}-{meta.damageMax}</span>
          </button>
        );
      })}
    </div>
  );
}
