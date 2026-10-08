import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_ROOMS, UNASSIGNED, type RoomEntry } from '../lib/rooms';
import { RoomCard } from './RoomBadge';

const POPOVER_ID = 'room-badge-popover';
// Matches max-w-xs; used to keep the popover inside the viewport.
const POPOVER_MAX_W = 320;

interface Props {
  rooms: RoomEntry[];
  /** Live dweller count per room key. */
  counts: Map<string, number>;
  total: number;
  /** Label of the leading "everything" badge. */
  allLabel?: string;
  unassignedCount: number;
  active: string;
  onSelect: (key: string) => void;
  /** Shown after the leading badge when there are no room badges to list. */
  emptyMessage?: string;
}

function Badge({ label, count, active, muted, onClick, onPeek, onUnpeek, describedBy }: {
  label: string;
  count: number;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
  /** Hover/focus: show details for this badge, anchored to its element. */
  onPeek?: (el: HTMLElement) => void;
  onUnpeek?: () => void;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPeek && ((e) => onPeek(e.currentTarget))}
      onMouseLeave={onUnpeek}
      onFocus={onPeek && ((e) => onPeek(e.currentTarget))}
      onBlur={onUnpeek}
      aria-describedby={describedBy}
      aria-pressed={active}
      className={[
        'shrink-0 flex items-center gap-1.5 h-7 pl-3 pr-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
        active ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100',
        muted && !active ? 'italic' : '',
      ].join(' ')}
    >
      {label}
      <span className={`min-w-5 px-1.5 rounded-full text-center leading-5 ${active ? 'bg-black/25' : 'bg-zinc-900 text-zinc-400'}`}>
        {count}
      </span>
    </button>
  );
}

export function RoomFilterBar({
  rooms, counts, total, allLabel = 'All rooms', unassignedCount, active, onSelect, emptyMessage,
}: Props) {
  const [peek, setPeek] = useState<{ key: string; room: RoomEntry | null; rect: DOMRect } | null>(null);
  const unpeek = () => setPeek(null);

  return (
    <div
      role="toolbar"
      aria-label="Filter dwellers by room"
      className="flex items-stretch bg-zinc-900 border-t border-zinc-700"
    >
      {/* Pinned: the "everything" badge stays put while the rooms scroll. */}
      <div className="shrink-0 flex items-center pl-3 pr-2 py-1.5 border-r border-zinc-800">
        <Badge label={allLabel} count={total} active={active === ALL_ROOMS} onClick={() => onSelect(ALL_ROOMS)} />
      </div>
      <div
        className="flex-1 min-w-0 flex items-center gap-2 pl-2 pr-3 py-1.5 overflow-x-auto [scrollbar-width:thin]"
        onWheel={(e) => {
          // Let a plain mouse wheel scroll the badge row sideways.
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
        // The popover is anchored to where the badge was; drop it once the row moves.
        onScroll={unpeek}
      >
        {emptyMessage && <span className="shrink-0 text-xs text-zinc-500 italic px-1">{emptyMessage}</span>}
        {rooms.map((r) => (
          <Badge
            key={r.key}
            label={r.name}
            count={counts.get(r.key) ?? 0}
            active={active === r.key}
            onClick={() => onSelect(r.key)}
            onPeek={(el) => setPeek({ key: r.key, room: r, rect: el.getBoundingClientRect() })}
            onUnpeek={unpeek}
            describedBy={peek?.key === r.key ? POPOVER_ID : undefined}
          />
        ))}
        {unassignedCount > 0 && (
          <Badge
            label="Unassigned"
            count={unassignedCount}
            active={active === UNASSIGNED}
            muted
            onClick={() => onSelect(UNASSIGNED)}
          />
        )}
      </div>
      {peek && createPortal(
        // Portaled + fixed so the scrolling badge row doesn't clip it; sits just above the badge.
        <RoomCard
          id={POPOVER_ID}
          role="tooltip"
          room={peek.room}
          className="fixed z-50 w-max max-w-xs pointer-events-none"
          style={{
            left: Math.max(8, Math.min(peek.rect.left, window.innerWidth - POPOVER_MAX_W - 8)),
            bottom: window.innerHeight - peek.rect.top + 6,
          }}
        />,
        document.body,
      )}
    </div>
  );
}
