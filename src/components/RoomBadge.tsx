import type { HTMLAttributes } from 'react';
import { SpecialIcon } from './SpecialIcon';
import { roomInfo, UNASSIGNED, type RoomEntry } from '../lib/rooms';
import { useSaveStore } from '../store/saveStore';

/** Room name, size/floor, what it does, and how full it is. Unpositioned. */
export function RoomDetails({ room }: { room: RoomEntry | null }) {
  if (!room) {
    return (
      <>
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">Room</div>
        <div className="text-base font-semibold italic text-zinc-400">Unassigned</div>
      </>
    );
  }

  const { role, stat, capacity, floor } = roomInfo(room.room);
  const occupants = room.dwellerIds.length;
  const details = [
    typeof room.room.level === 'number' ? `Lv ${room.room.level}` : null,
    (room.room.mergeLevel ?? 1) > 1 ? `${room.room.mergeLevel}-wide` : 'Single',
    floor !== null ? `Floor ${floor}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">Room</div>
      <div className="text-base font-semibold text-emerald-300 truncate leading-tight" title={room.name}>{room.name}</div>
      <div className="text-sm text-zinc-300 truncate">{details}</div>
      {role && (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-200 min-w-0">
          {stat && <SpecialIcon letter={stat} size={18} detail="The stat this room runs on" />}
          <span className="truncate">{role}</span>
        </div>
      )}
      <div className="text-sm text-zinc-400">
        {capacity !== null
          ? <><span className={occupants >= capacity ? 'text-emerald-300' : 'text-zinc-200'}>{occupants}/{capacity}</span> dwellers</>
          : <>{occupants} {occupants === 1 ? 'dweller' : 'dwellers'}</>}
      </div>
    </>
  );
}

/** RoomDetails in the shared dark card chrome; the caller positions it. */
export function RoomCard({ room, className = '', ...rest }: { room: RoomEntry | null } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded bg-zinc-900/90 border border-zinc-700 px-2.5 py-1.5 shadow-lg ${className}`} {...rest}>
      <RoomDetails room={room} />
    </div>
  );
}

/** Overlay shown in the top-left corner of the dweller portrait; clicking it filters the dweller strip to this room. */
export function RoomBadge({ room }: { room: RoomEntry | null }) {
  const showRoom = useSaveStore((s) => s.showRoom);
  return (
    <button
      type="button"
      onClick={() => showRoom(room?.key ?? UNASSIGNED)}
      aria-label={`Room: ${room?.name ?? 'Unassigned'}. Show dwellers in this room`}
      title="Show dwellers in this room"
      data-testid="dweller-room"
      className="absolute top-1.5 left-1.5 max-w-[calc(100%-68px)] text-left rounded bg-zinc-900/90 border border-zinc-700 px-2.5 py-1.5 shadow-lg transition-colors hover:border-green-500 hover:bg-zinc-800/90 focus-visible:outline-none focus-visible:border-green-500"
    >
      <RoomDetails room={room} />
    </button>
  );
}
