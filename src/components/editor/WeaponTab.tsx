import { useEffect, useRef, useState } from 'react';
import { loadWeaponIndex } from '../../lib/weaponIndex';
import { SpriteCrop } from '../SpriteCrop';
import { setWeapon } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { WeaponIndex } from '../../types/weapons';
import type { IconRect } from '../../types/icons';
import type { RenderableDweller } from '../../lib/dwellerRender';
import { SortFilterBar } from './SortFilterBar';
import { sortByDamage, filterByText, type SortDir } from '../../lib/pickerSort';
import { UnknownItemCard } from './UnknownItemCard';
import { fluidGridStyle, fluidTileStyle } from './fluidGrid';
import { useUnknownItemGuard } from './UnknownItemModal';
import { useFavorites, pinFavorites } from '../../lib/useFavorites';
import { FavoriteToggle } from './FavoriteToggle';
import { requestGearChange } from './GearSwapDialog';
import { DEFAULT_WEAPON_ID } from '../../lib/stash';
import { useGearSource, useStashGear } from '../../lib/useStashGear';
import { humanizeId } from '../StashItemInfo';
import { StashCornerChip } from './StashCornerChip';
import { StashViewHeader } from './StashViewHeader';

function WeaponTile({ name, icon, damage, selected, onClick, title, children }: {
  name: string;
  icon?: IconRect | null;
  damage: string;
  selected: boolean;
  onClick: () => void;
  title?: string;
  /** Corner overlays (favorite marker, stash count, …). */
  children?: React.ReactNode;
}) {
  return (
    <button
      title={title ?? name}
      aria-pressed={selected}
      data-selected={selected || undefined}
      onClick={onClick}
      className={[
        'group rounded border flex flex-col items-center overflow-hidden transition-colors',
        selected
          ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
      ].join(' ')}
      style={{ ...fluidTileStyle(170, 170), position: 'relative' }}
    >
      {children}
      <div className="flex-1 flex items-center justify-center w-full">
        {icon
          ? <SpriteCrop rect={icon} size={104} title={name} />
          : <div className="w-16 h-16" />}
      </div>
      <div className="w-full px-1 pb-1 text-center leading-tight">
        <div className="text-xs font-medium text-zinc-100 truncate">{name}</div>
        <div className="text-[11px] text-zinc-400">{damage}</div>
      </div>
    </button>
  );
}

export function WeaponTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [weaponIndex, setWeaponIndex] = useState<WeaponIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return d?.equipedWeapon?.id;
  });
  const equipFromStash = useSaveStore((s) => s.equipSelectedFromStash);

  const [dir, setDir] = useState<SortDir>('default');
  const [query, setQuery] = useState('');
  const [source, setSource] = useGearSource('weapon');
  const stash = useStashGear('Weapon');

  useEffect(() => {
    unmounted.current = false;
    loadWeaponIndex().then((idx) => {
      if (!unmounted.current) setWeaponIndex(idx);
    });
    return () => { unmounted.current = true; };
  }, []);

  // The equipped weapon is unknown when its id isn't in our catalog (content
  // added to the game after this editor's last update). Hooks must run before
  // any early return, so this is computed unconditionally (known when the index
  // hasn't loaded yet, so no card flashes during loading).
  const known = !weaponIndex || !equippedId || equippedId in weaponIndex.weapons;
  const { isUnknown, openInfo, guardSelect, modal } = useUnknownItemGuard(equippedId, known);
  const { favorites, toggle } = useFavorites('weapon');

  if (!weaponIndex) {
    return <div className="text-zinc-400 text-sm">Loading weapons…</div>;
  }

  const metaOf = (id: string) => weaponIndex.weapons[id];
  const damageOf = (id: string) => {
    const m = metaOf(id);
    return m ? `${m.damageMin}-${m.damageMax}` : '';
  };
  const equipped = equippedId ?? DEFAULT_WEAPON_ID;
  const unequip = () => guardSelect(() => requestGearChange((d) => setWeapon(d, DEFAULT_WEAPON_ID)));

  const all = Object.entries(weaponIndex.weapons).map(([id, meta]) => ({ id, ...meta }));
  const searched = filterByText(all, query, (w) => w.name);
  const def = searched.filter((w) => w.id === DEFAULT_WEAPON_ID);
  const rest = sortByDamage(searched.filter((w) => w.id !== DEFAULT_WEAPON_ID), dir);
  // This custom grid mirrors OptionGrid's favorites pattern by hand: pin via
  // pinFavorites here, and render <FavoriteToggle> inside each cell which must keep
  // `position: relative` + the `group` class. Keep these in sync with OptionGrid.
  const ordered = pinFavorites([...def, ...rest], (w) => w.id, favorites);

  const stashed = sortByDamage(
    filterByText(
      stash.groups.map((g) => {
        const meta = metaOf(g.item.id);
        return {
          group: g,
          name: meta?.name ?? humanizeId(g.item.id),
          icon: meta?.icon,
          damageMin: meta?.damageMin ?? 0,
          damageMax: meta?.damageMax ?? 0,
        };
      }),
      query,
      (w) => w.name,
    ),
    dir,
  );

  return (
    <div>
      <SortFilterBar
        mode="weapon"
        query={query}
        onQueryChange={setQuery}
        onReset={() => { setQuery(''); setDir('default'); }}
        dir={dir}
        onDirChange={setDir}
        source={source}
        onSourceChange={setSource}
        stashCount={stash.count}
      />
      {source === 'global' ? (
        <div
          className="grid gap-1.5 p-1"
          style={fluidGridStyle(170, 0.9)}
        >
          {isUnknown && equippedId && (
            <UnknownItemCard id={equippedId} onWarn={openInfo} />
          )}
          {ordered.map((w) => {
            const inStash = stash.countById.get(w.id) ?? 0;
            return (
              <WeaponTile
                key={w.id}
                name={w.name}
                icon={w.icon}
                damage={damageOf(w.id)}
                selected={w.id === equippedId}
                onClick={() => guardSelect(() => requestGearChange((d) => setWeapon(d, w.id)))}
                title={inStash ? `${w.name} (${inStash} in stash; picking it here adds a new one)` : w.name}
              >
                {inStash > 0 && <StashCornerChip>In stash ×{inStash}</StashCornerChip>}
                <FavoriteToggle active={favorites.includes(w.id)} onToggle={() => toggle(w.id)} />
              </WeaponTile>
            );
          })}
        </div>
      ) : (
        <>
          <StashViewHeader
            name={isUnknown ? equipped : metaOf(equipped)?.name ?? humanizeId(equipped)}
            icon={metaOf(equipped)?.icon && <SpriteCrop rect={metaOf(equipped).icon!} size={44} />}
            detail={damageOf(equipped) && `${damageOf(equipped)} DMG`}
            warning={isUnknown ? 'Not recognized by this editor' : undefined}
            onUnequip={equipped !== DEFAULT_WEAPON_ID ? unequip : undefined}
          />
          {stashed.length === 0 ? (
            <div className="px-2 py-2 text-sm text-zinc-500">
              {stash.count === 0 ? 'No weapons in the stash.' : 'No stashed weapons match.'}
            </div>
          ) : (
            <div className="grid gap-1.5 p-1" style={fluidGridStyle(170, 0.9)}>
              {stashed.map((w) => (
                <WeaponTile
                  key={w.group.key}
                  name={w.name}
                  icon={w.icon}
                  damage={damageOf(w.group.item.id)}
                  selected={false}
                  onClick={() => equipFromStash(w.group.indices[0])}
                  title={`Equip ${w.name} from the stash (swaps with the equipped weapon)`}
                >
                  <StashCornerChip count={w.group.indices.length} />
                </WeaponTile>
              ))}
            </div>
          )}
        </>
      )}
      {modal}
    </div>
  );
}
