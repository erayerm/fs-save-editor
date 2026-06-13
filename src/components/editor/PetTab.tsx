import { useEffect, useRef, useState } from 'react';
import { loadPetIndex } from '../../lib/petIndex';
import { SpriteCrop } from '../SpriteCrop';
import { setPet, clearPet } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { PetIndex, PetMeta } from '../../types/pets';
import type { RenderableDweller } from '../../lib/dwellerRender';
import { SortFilterBar } from './SortFilterBar';
import { filterByText } from '../../lib/pickerSort';
import { type Rarity } from '../../lib/petRarity';
import { UnknownItemCard } from './UnknownItemCard';
import { useUnknownItemGuard } from './UnknownItemModal';

const RARITY_ORDER: Record<string, number> = { Normal: 0, Rare: 1, Legendary: 2 };

export function PetTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [petIndex, setPetIndex] = useState<PetIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return (d as { equippedPet?: { id?: string } } | null)?.equippedPet?.id;
  });

  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState<Rarity | null>(null);

  useEffect(() => {
    unmounted.current = false;
    loadPetIndex().then((idx) => { if (!unmounted.current) setPetIndex(idx); });
    return () => { unmounted.current = true; };
  }, []);

  // The equipped pet is unknown when its id isn't in our catalog. Computed before
  // any early return so the hook order stays stable (known while loading).
  const known = !petIndex || !equippedId || equippedId in petIndex.pets;
  const { isUnknown, openInfo, guardSelect, modal } = useUnknownItemGuard(equippedId, known);

  if (!petIndex) return <div className="text-zinc-400 text-sm">Loading pets…</div>;

  const pets: PetMeta[] = Object.values(petIndex.pets).sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.breed.localeCompare(b.breed) ||
      (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0),
  );

  const byRarity = rarity ? pets.filter((p) => p.rarity === rarity) : pets;
  const visible = filterByText(byRarity, query, (p) => `${p.name} ${p.bonus} ${p.bonusLabel} ${p.rarity}`);

  return (
    <div>
      <SortFilterBar
        mode="pet"
        query={query}
        onQueryChange={setQuery}
        onReset={() => { setQuery(''); setRarity(null); }}
        rarity={rarity}
        onRarityChange={setRarity}
      />
      <div className="grid gap-1.5 p-1 justify-between" style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}>
        {/* Unknown equipped pet — pinned warning card (preserved on export). */}
        {isUnknown && equippedId && (
          <UnknownItemCard id={equippedId} onWarn={openInfo} />
        )}
        {/* None card — clears the pet (pinned to the front). */}
        <button
          key="__none__"
          title="No pet"
          aria-pressed={!equippedId}
          onClick={() => guardSelect(() => useSaveStore.getState().updateSelectedDwellerRaw((d) => clearPet(d)))}
          className={[
            'rounded border flex flex-col items-center justify-center overflow-hidden transition-colors',
            !equippedId ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
          ].join(' ')}
          style={{ width: 170, height: 170 }}
        >
          <span className="text-sm text-zinc-300">None</span>
        </button>

        {visible.map((pet) => {
          const isEquipped = pet.id === equippedId;
          return (
            <button
              key={pet.id}
              title={`${pet.name} (${pet.rarity})`}
              aria-pressed={isEquipped}
              onClick={() => guardSelect(() => useSaveStore.getState().updateSelectedDwellerRaw((d) => setPet(d, pet)))}
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
                <div className="text-[11px] text-zinc-400">{pet.rarity}</div>
                <div className="text-[11px] text-zinc-400 truncate" title={pet.bonusLabel}>{pet.bonusLabel}</div>
              </div>
            </button>
          );
        })}
      </div>
      {modal}
    </div>
  );
}
