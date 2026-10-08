import { useRef, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useSaveStore } from '../store/saveStore';
import { CharacterCard } from './CharacterCard';
import { cardMetrics } from '../lib/cardMetrics';
import { useViewportHeight } from '../lib/useViewportHeight';
import { useWindowedRange } from '../lib/useWindowedRange';
import { filterByText } from '../lib/pickerSort';
import { buildRoomAssignments, getOccupiedRooms, ALL_ROOMS, UNASSIGNED } from '../lib/rooms';
import { RoomFilterBar } from './RoomFilterBar';

const OVERSCAN = 3;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RoomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <circle cx="14.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * A toggle button whose search field slides out to its left. Closing the
 * field also clears it.
 */
function ExpandingSearch({
  icon, value, onChange, placeholder, label, openTitle,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Accessible name of the input. */
  label: string;
  /** Title/aria-label of the toggle while closed. */
  openTitle: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // Focus the field as it expands.
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const closeTitle = `Close ${openTitle.charAt(0).toLowerCase()}${openTitle.slice(1)}`;
  return (
    <>
      {/* Expanding search field (grows to the left); clipped to 0 when closed */}
      <div
        className={[
          'flex items-center overflow-hidden transition-all duration-200 ease-out',
          open ? 'w-48 xl:w-56' : 'w-0',
        ].join(' ')}
      >
        <SearchIcon className="w-4 h-4 ml-2.5 shrink-0 text-zinc-300" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { onChange(''); setOpen(false); } }}
          placeholder={placeholder}
          aria-label={label}
          tabIndex={open ? 0 : -1}
          className="flex-1 min-w-0 h-8 bg-transparent px-2 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            aria-label="Clear text"
            className="shrink-0 mr-1 flex items-center justify-center w-5 h-5 rounded text-zinc-300 hover:bg-black/20"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => { if (open) { onChange(''); setOpen(false); } else setOpen(true); }}
        title={open ? closeTitle : openTitle}
        aria-label={open ? closeTitle : openTitle}
        aria-pressed={open}
        className={`shrink-0 flex items-center justify-center w-9 transition-colors hover:bg-black/20 ${
          value ? 'text-emerald-300' : 'text-zinc-200'
        }`}
      >
        {icon}
      </button>
    </>
  );
}

export function CharacterFooter() {
  const save = useSaveStore((s) => s.save);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const roomQuery = useSaveStore((s) => s.roomQuery);
  const setRoomQuery = useSaveStore((s) => s.setRoomQuery);
  const roomFilter = useSaveStore((s) => s.roomFilter);
  const setRoomFilter = useSaveStore((s) => s.setRoomFilter);

  const all = save?.dwellers.dwellers ?? [];
  const { rooms, assignments, counts } = useMemo(() => {
    const assignments = buildRoomAssignments(save);
    const counts = new Map<string, number>();
    for (const d of save?.dwellers.dwellers ?? []) {
      const entry = assignments.get(d.serializeId);
      if (entry) counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
    }
    const rooms = getOccupiedRooms(save).filter((r) => counts.has(r.key));
    return { rooms, assignments, counts };
  }, [save]);
  const unassignedCount = all.filter((d) => !assignments.has(d.serializeId)).length;

  // The room search narrows the badge row; with no specific badge picked, the
  // strip shows the dwellers of every matching room.
  const roomSearching = roomQuery.trim() !== '';
  const matchingRooms = filterByText(rooms, roomQuery, (r) => r.name);
  const matchingKeys = new Set(matchingRooms.map((r) => r.key));
  const showUnassigned = unassignedCount > 0 && filterByText(['Unassigned'], roomQuery, (s) => s).length > 0;
  const inScope = (key: string | undefined) =>
    key === undefined ? showUnassigned : !roomSearching || matchingKeys.has(key);

  // Fall back to "All" when the selected room empties out (e.g. after an
  // eviction) or no longer matches the room search.
  const activeRoom =
    (roomFilter === UNASSIGNED && showUnassigned) || matchingKeys.has(roomFilter) ? roomFilter : ALL_ROOMS;
  const inRoom = all.filter((d) => {
    const key = assignments.get(d.serializeId)?.key;
    if (activeRoom === ALL_ROOMS) return roomSearching ? inScope(key) : true;
    return activeRoom === UNASSIGNED ? key === undefined : key === activeRoom;
  });
  const scopeTotal = roomSearching
    ? all.filter((d) => inScope(assignments.get(d.serializeId)?.key)).length
    : all.length;
  const dwellers = filterByText(inRoom, query, (d) => `${d.name ?? ''} ${d.lastName ?? ''}`);

  // The room filter can also change from outside the strip (the portrait's room badge).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [roomFilter, roomQuery]);
  const count = dwellers.length;

  const metrics = cardMetrics(useViewportHeight());
  const { start, end } = useWindowedRange(scrollRef, metrics.slot, count, OVERSCAN);

  if (!save) return null;

  return (
    <div className="shrink-0 relative">
      {/* Filter controls: one solid tab attached above the room badges. Each
          icon toggles a search field that grows to its left; all share the
          same continuous background. */}
      <div className="absolute right-3 -top-8 z-20 flex items-stretch h-8 rounded-t-md overflow-hidden bg-zinc-700">
        <ExpandingSearch
          icon={<RoomIcon className="w-4 h-4" />}
          value={roomQuery}
          onChange={setRoomQuery}
          placeholder="Search rooms…"
          label="Search rooms"
          openTitle="Search rooms"
        />
        <div className="w-px my-1.5 bg-zinc-600" aria-hidden="true" />
        <ExpandingSearch
          icon={<PersonIcon className="w-4 h-4" />}
          value={query}
          onChange={setQuery}
          placeholder="Filter by name…"
          label="Filter dwellers by name"
          openTitle="Filter dwellers by name"
        />
      </div>

      <RoomFilterBar
        rooms={matchingRooms}
        counts={counts}
        total={scopeTotal}
        allLabel={roomSearching ? 'All matches' : 'All rooms'}
        unassignedCount={showUnassigned ? unassignedCount : 0}
        active={activeRoom}
        onSelect={setRoomFilter}
        emptyMessage={roomSearching && matchingRooms.length === 0 && !showUnassigned
          ? `No rooms match “${roomQuery.trim()}”.`
          : undefined}
      />

      <div
        ref={scrollRef}
        className="bg-zinc-900 border-t border-zinc-800 overflow-x-auto overflow-y-hidden"
        style={{ position: 'relative', height: metrics.strip }}
      >
        {count === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            {query
              ? <>No dwellers match “{query}”.</>
              : roomSearching ? 'No dwellers in matching rooms.' : 'No dwellers in this room.'}
          </div>
        ) : (
          /* Inner spacer to give the scrollbar the correct total width */
          <div style={{ width: count * metrics.slot, height: '100%', position: 'relative' }}>
            {dwellers.slice(start, end).map((dweller, localIdx) => {
              const globalIdx = start + localIdx;
              return (
                <div
                  key={dweller.serializeId}
                  style={{ position: 'absolute', left: globalIdx * metrics.slot + metrics.gap / 2, top: 8, height: 'calc(100% - 16px)' }}
                >
                  <CharacterCard dweller={dweller} room={assignments.get(dweller.serializeId) ?? null} metrics={metrics} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
