import { useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import {
  getStashItems, groupStash, sortStashGroups, addStashItems, removeStashItemAt, removeStashItemsAt,
  stashCapacity, type StashGroup, type StashSort,
} from '../lib/stash';
import { filterByText } from '../lib/pickerSort';
import { VAULT_PETS_FULL, vaultHasPetRoom } from '../lib/petLimits';
import { SortFilterBar } from './editor/SortFilterBar';
import { fluidGridStyle, fluidTileStyle } from './editor/fluidGrid';
import {
  describeStashItem, useItemCatalogs, StashItemIcon, type ItemCatalogs, type ItemDisplay,
} from './StashItemInfo';

/** Tiles per page: three rows on a typical desktop-width grid. */
const PAGE_SIZE = 24;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Weapon', label: 'Weapons' },
  { id: 'Outfit', label: 'Outfits' },
  { id: 'Pet', label: 'Pets' },
  { id: 'Junk', label: 'Junk' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function CapacityBar({ used, capacity }: { used: number; capacity: number }) {
  const ratio = capacity > 0 ? used / capacity : 1;
  const color = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <div
        className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden"
        role="meter"
        aria-label="Stash capacity"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={used}
      >
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <span className={`text-sm font-mono whitespace-nowrap ${ratio >= 1 ? 'text-red-400' : 'text-zinc-300'}`}>
        {used} / {capacity}
      </span>
    </div>
  );
}

/** Page indices to show as buttons: first, last, and the current page ±1, with null for gaps. */
function pageList(page: number, pageCount: number): (number | null)[] {
  const keep = new Set([0, pageCount - 1, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (keep.has(i)) out.push(i);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

function Pagination({ page, pageCount, from, to, total, onPage }: {
  page: number; pageCount: number; from: number; to: number; total: number; onPage: (p: number) => void;
}) {
  const btn = 'min-w-8 h-8 px-2 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const idle = 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:hover:bg-zinc-700';
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 mt-3 px-1" aria-label="Stash pages">
      <span className="text-xs text-zinc-500">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={`${btn} ${idle}`} disabled={page === 0}
          onClick={() => onPage(page - 1)} aria-label="Previous page">
          ‹ Prev
        </button>
        {pageList(page, pageCount).map((p, i) => p === null ? (
          <span key={`gap-${i}`} className="px-1 text-zinc-500">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onPage(p)}
            aria-label={`Page ${p + 1}`} aria-current={p === page ? 'page' : undefined}
            className={`${btn} ${p === page ? 'bg-green-600 text-white' : idle}`}>
            {p + 1}
          </button>
        ))}
        <button type="button" className={`${btn} ${idle}`} disabled={page === pageCount - 1}
          onClick={() => onPage(page + 1)} aria-label="Next page">
          Next ›
        </button>
      </div>
    </nav>
  );
}

/** Tile design size (px): same width as the Weapon/Outfit picker tiles. */
const TILE_W = 170;
const TILE_H = 250;

function StashTile({ group, display, catalogs, addBlocked, onAdd, onRemove, onRemoveAll }: {
  group: StashGroup;
  display: ItemDisplay;
  catalogs: ItemCatalogs;
  /** Why another copy can't be added (stash or vault pet limit reached), or null. */
  addBlocked: string | null;
  onAdd: () => void;
  onRemove: () => void;
  onRemoveAll: () => void;
}) {
  const { name, detail } = display;
  const count = group.indices.length;
  const iconSize = group.item.type === 'Outfit' ? 150 : 104;
  const btn = 'flex-1 h-7 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 flex items-center justify-center transition-colors';
  return (
    <li
      className="group relative rounded border border-zinc-700 bg-zinc-900 hover:border-zinc-500 flex flex-col items-center overflow-hidden transition-colors"
      style={fluidTileStyle(TILE_W, TILE_H)}
    >
      <span
        className="absolute top-1.5 left-1.5 px-1.5 rounded bg-zinc-800/90 text-xs font-mono font-semibold text-emerald-400"
        aria-label={`${count} in stash`}
      >
        ×{count}
      </span>
      <button type="button" onClick={onRemoveAll} aria-label={`Remove all ${name}`}
        title={count > 1 ? `Remove all ${count}` : 'Remove'}
        className="absolute top-1 right-1 w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:bg-red-600 hover:text-white transition-colors">
        <TrashIcon className="w-4 h-4" />
      </button>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center pt-6">
        <StashItemIcon item={group.item} display={display} catalogs={catalogs} size={iconSize} />
      </div>

      <div className="w-full px-1.5 text-center leading-tight">
        <div className="text-xs font-medium text-zinc-100 truncate" title={name}>{name}</div>
        <div className="text-[11px] text-zinc-400 h-4 flex items-center justify-center">{detail}</div>
      </div>

      <div className="w-full flex gap-1 p-1.5">
        <button type="button" onClick={onRemove} aria-label={`Remove one ${name}`} title="Remove one"
          className={`${btn} hover:bg-zinc-700`}>
          −
        </button>
        <button type="button" onClick={onAdd} disabled={!!addBlocked} aria-label={`Add one ${name}`}
          title={addBlocked ?? 'Add one'}
          className={`${btn} hover:bg-green-600 disabled:opacity-40 disabled:hover:bg-zinc-800 disabled:cursor-not-allowed`}>
          +
        </button>
      </div>
    </li>
  );
}

export function StashPanel() {
  const save = useSaveStore((s) => s.save);
  const setVault = useSaveStore((s) => s.setVault);
  const catalogs = useItemCatalogs();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StashSort>('default');
  const [page, setPage] = useState(0);

  if (!save) return null;

  const items = getStashItems(save);
  const capacity = stashCapacity(save);
  const full = items.length >= capacity;
  const petsFull = !vaultHasPetRoom(save);
  const addBlocked = (g: StashGroup) =>
    full ? 'Stash is full' : petsFull && g.item.type === 'Pet' ? VAULT_PETS_FULL : null;

  const displays = new Map<string, ItemDisplay>();
  const groups = groupStash(items);
  for (const g of groups) displays.set(g.key, describeStashItem(g.item, catalogs));
  const nameOf = (g: StashGroup) => displays.get(g.key)!.name;

  const countOf = (f: Filter) =>
    f === 'all' ? items.length : items.filter((it) => it.type === f).length;
  const ofType = filter === 'all' ? groups : groups.filter((g) => g.item.type === filter);
  const matching = sortStashGroups(filterByText(ofType, query, nameOf), sort, nameOf);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  // Removing items can empty the last page; fall back to the new last page.
  const current = Math.min(page, pageCount - 1);
  const shown = matching.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  return (
    <section aria-labelledby="stash-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mb-2">
        <h2 id="stash-heading" className="text-emerald-400 text-xl font-bold tracking-wide">Stash</h2>
        <div className="flex flex-col items-end gap-1">
          <CapacityBar used={items.length} capacity={capacity} />
          {full && <span className="text-red-400 text-xs">The stash is full; nothing more can be stashed.</span>}
          {!full && petsFull && <span className="text-amber-400 text-xs">{VAULT_PETS_FULL}</span>}
        </div>
      </div>
      <p className="text-zinc-500 text-xs mb-4">
        Items in the vault's storage. Capacity is 10 plus what your Storage rooms add.
      </p>

      <div className="flex flex-wrap gap-2 mb-2" role="tablist">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => resetPage(setFilter)(id)}
            className={[
              'px-3 py-1 rounded text-sm font-medium',
              filter === id ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
            ].join(' ')}
          >
            {label} <span className="opacity-70">({countOf(id)})</span>
          </button>
        ))}
      </div>

      <SortFilterBar
        mode="stash"
        query={query}
        onQueryChange={resetPage(setQuery)}
        onReset={() => { setQuery(''); setSort('default'); setFilter('all'); setPage(0); }}
        stashSort={sort}
        onStashSortChange={resetPage(setSort)}
      />

      {shown.length === 0 ? (
        <div className="text-zinc-500 text-sm px-2">
          {items.length === 0 ? 'The stash is empty.' : 'No items match.'}
        </div>
      ) : (
        <ul className="grid gap-1.5 p-1" style={fluidGridStyle(TILE_W, 0.9)}>
          {shown.map((g) => (
            <StashTile
              key={g.key}
              group={g}
              display={displays.get(g.key)!}
              catalogs={catalogs}
              addBlocked={addBlocked(g)}
              onAdd={() => setVault((s) => addStashItems(s, [{ ...g.item }]))}
              onRemove={() => setVault((s) => removeStashItemAt(s, g.indices[g.indices.length - 1]))}
              onRemoveAll={() => setVault((s) => removeStashItemsAt(s, g.indices))}
            />
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <Pagination
          page={current}
          pageCount={pageCount}
          from={current * PAGE_SIZE + 1}
          to={current * PAGE_SIZE + shown.length}
          total={matching.length}
          onPage={setPage}
        />
      )}
    </section>
  );
}
