import { useEffect, useRef, useState } from 'react';
import { loadPetIndex } from '../../lib/petIndex';
import { SpriteCrop } from '../SpriteCrop';
import { setPet, clearPet } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { PetIndex, PetMeta } from '../../types/pets';
import type { RenderableDweller } from '../../lib/dwellerRender';

const RARITY_ORDER: Record<string, number> = { Normal: 0, Rare: 1, Legendary: 2 };

export function PetTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [petIndex, setPetIndex] = useState<PetIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return (d as { equippedPet?: { id?: string } } | null)?.equippedPet?.id;
  });

  useEffect(() => {
    unmounted.current = false;
    loadPetIndex().then((idx) => { if (!unmounted.current) setPetIndex(idx); });
    return () => { unmounted.current = true; };
  }, []);

  if (!petIndex) return <div className="text-zinc-400 text-sm">Loading pets…</div>;

  const pets: PetMeta[] = Object.values(petIndex.pets).sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.breed.localeCompare(b.breed) ||
      (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0),
  );

  return (
    <div className="grid gap-1.5 p-1 pt-4 justify-between" style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}>
      {/* None card — clears the pet (pinned to the front). */}
      <button
        key="__none__"
        title="No pet"
        aria-pressed={!equippedId}
        onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => clearPet(d))}
        className={[
          'rounded border flex flex-col items-center justify-center overflow-hidden transition-colors',
          !equippedId ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
        ].join(' ')}
        style={{ width: 170, height: 170 }}
      >
        <span className="text-sm text-zinc-300">None</span>
      </button>

      {pets.map((pet) => {
        const isEquipped = pet.id === equippedId;
        return (
          <button
            key={pet.id}
            title={`${pet.name} (${pet.rarity})`}
            aria-pressed={isEquipped}
            onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => setPet(d, pet))}
            className={[
              'rounded border flex flex-col items-center overflow-hidden transition-colors',
              isEquipped ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
            ].join(' ')}
            style={{ width: 170, height: 170 }}
          >
            <div className="flex-1 flex items-center justify-center w-full">
              {pet.icon ? <SpriteCrop rect={pet.icon} size={104} title={pet.name} /> : <div className="w-16 h-16" />}
            </div>
            <div className="w-full px-1 pb-1 text-center leading-tight">
              <div className="text-xs font-medium text-zinc-100 truncate">{pet.name}</div>
              <div className="text-[11px] text-zinc-400">{pet.rarity} · {pet.bonusLabel}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
