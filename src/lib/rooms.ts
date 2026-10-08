import type { SaveJson, Special } from '../types/save';

/**
 * A room in vault.rooms. The room's `dwellers` array holds the serializeIds of
 * the dwellers currently assigned to it; that array is the source of truth for
 * assignment (a dweller's own `savedRoom` can be stale).
 */
export interface Room {
  type: string;
  class?: string;
  /** Merge width: 1, 2 or 3 adjacent segments. */
  mergeLevel?: number;
  /** Upgrade level: 1..3. */
  level?: number;
  row?: number;
  col?: number;
  dwellers?: number[];
  deserializeID?: number;
  [k: string]: unknown;
}

// Internal room type -> in-game display name.
const ROOM_NAMES: Record<string, string> = {
  Entrance: 'Vault Door',
  Elevator: 'Elevator',
  LivingQuarters: 'Living Quarters',
  Storage: 'Storage Room',
  Overseer: "Overseer's Office",
  Radio: 'Radio Studio',
  Geothermal: 'Power Generator',
  Energy2: 'Nuclear Reactor',
  Cafeteria: 'Diner',
  Hydroponic: 'Garden',
  WaterPlant: 'Water Treatment',
  Water2: 'Water Purification',
  NukaCola: 'Nuka-Cola Bottler',
  MedBay: 'Medbay',
  ScienceLab: 'Science Lab',
  Gym: 'Weight Room',
  Armory: 'Armory',
  SuperRoom2: 'Fitness Room',
  Bar: 'Lounge',
  Classroom: 'Classroom',
  Dojo: 'Athletics Room',
  Casino: 'Game Room',
  BarberShop: 'Barbershop',
  WeaponFactory: 'Weapon Workshop',
  OutfitFactory: 'Outfit Workshop',
  DesignFactory: 'Theme Workshop',
};

// What each room type does, and the SPECIAL stat that drives it.
const ROOM_ROLES: Record<string, { role: string; stat?: Special }> = {
  Geothermal: { role: 'Produces Power', stat: 'S' },
  Energy2: { role: 'Produces Power', stat: 'S' },
  Cafeteria: { role: 'Produces Food', stat: 'A' },
  Hydroponic: { role: 'Produces Food', stat: 'A' },
  WaterPlant: { role: 'Produces Water', stat: 'P' },
  Water2: { role: 'Produces Water', stat: 'P' },
  NukaCola: { role: 'Produces Food & Water', stat: 'E' },
  MedBay: { role: 'Produces Stimpaks', stat: 'I' },
  ScienceLab: { role: 'Produces RadAway', stat: 'I' },
  Radio: { role: 'Broadcasts to the Wasteland', stat: 'C' },
  Gym: { role: 'Trains Strength', stat: 'S' },
  Armory: { role: 'Trains Perception', stat: 'P' },
  SuperRoom2: { role: 'Trains Endurance', stat: 'E' },
  Bar: { role: 'Trains Charisma', stat: 'C' },
  Classroom: { role: 'Trains Intelligence', stat: 'I' },
  Dojo: { role: 'Trains Agility', stat: 'A' },
  Casino: { role: 'Trains Luck', stat: 'L' },
  LivingQuarters: { role: 'Living space', stat: 'C' },
  Entrance: { role: 'Guards the vault door' },
  Storage: { role: 'Stores items' },
  Overseer: { role: 'Runs quests' },
  BarberShop: { role: 'Changes looks' },
  WeaponFactory: { role: 'Crafts weapons' },
  OutfitFactory: { role: 'Crafts outfits' },
  DesignFactory: { role: 'Crafts themes' },
};

const WORK_CLASSES = new Set(['Production', 'Consumable', 'Training']);

export interface RoomInfo {
  role: string | null;
  stat: Special | null;
  /** Work slots (2 per merged segment) for production, consumable, training and radio rooms; null otherwise. */
  capacity: number | null;
  /** 1-based floor, counted from the top. */
  floor: number | null;
}

export function roomInfo(room: Room): RoomInfo {
  const meta = ROOM_ROLES[room.type];
  const works = (WORK_CLASSES.has(room.class ?? '') && room.type !== 'BarberShop') || room.type === 'Radio';
  return {
    role: meta?.role ?? null,
    stat: meta?.stat ?? null,
    capacity: works ? 2 * (room.mergeLevel ?? 1) : null,
    floor: typeof room.row === 'number' ? room.row + 1 : null,
  };
}

/** Display names of the rooms a SPECIAL stat works in and trains in. */
export function roomsForStat(stat: Special): { work: string[]; training: string[] } {
  const work: string[] = [];
  const training: string[] = [];
  for (const [type, meta] of Object.entries(ROOM_ROLES)) {
    if (meta.stat !== stat) continue;
    (meta.role.startsWith('Trains') ? training : work).push(ROOM_NAMES[type] ?? type);
  }
  return { work, training };
}

export function getRooms(s: SaveJson | null | undefined): Room[] {
  const rooms = (s?.vault as { rooms?: unknown } | undefined)?.rooms;
  return Array.isArray(rooms) ? (rooms as Room[]) : [];
}

/** Room-filter keys for "every room" and "no room", alongside the RoomEntry keys. */
export const ALL_ROOMS = 'all';
export const UNASSIGNED = 'unassigned';

/** One occupied room instance, named so same-type rooms stay distinguishable. */
export interface RoomEntry {
  /** Stable key: the room's deserializeID, or its array index when missing. */
  key: string;
  room: Room;
  /** Display name, lettered when the vault has several occupied rooms of this type ("Power Generator B"). */
  name: string;
  dwellerIds: number[];
}

const letter = (i: number): string =>
  i < 26 ? String.fromCharCode(65 + i) : letter(Math.floor(i / 26) - 1) + letter(i % 26);

/**
 * Every room with at least one assigned dweller, ordered top floor first and
 * left to right. Same-type rooms are kept separate and lettered A, B, C… in
 * that order.
 */
export function getOccupiedRooms(s: SaveJson | null | undefined): RoomEntry[] {
  // Rooms can list ids of dwellers no longer in the save; ignore those.
  const known = new Set((s?.dwellers?.dwellers ?? []).map((d) => d.serializeId));
  const occupied = getRooms(s)
    .map((room, i) => ({
      room,
      i,
      ids: Array.isArray(room.dwellers) ? room.dwellers.filter((id) => known.has(id)) : [],
    }))
    .filter(({ ids }) => ids.length > 0)
    .sort((a, b) => ((a.room.row ?? 0) - (b.room.row ?? 0)) || ((a.room.col ?? 0) - (b.room.col ?? 0)) || (a.i - b.i));

  const totals = new Map<string, number>();
  for (const { room } of occupied) totals.set(room.type, (totals.get(room.type) ?? 0) + 1);
  const seen = new Map<string, number>();

  return occupied.map(({ room, i, ids }) => {
    const n = seen.get(room.type) ?? 0;
    seen.set(room.type, n + 1);
    const base = roomDisplayName(room);
    return {
      key: typeof room.deserializeID === 'number' ? String(room.deserializeID) : `idx-${i}`,
      room,
      name: (totals.get(room.type) ?? 0) > 1 ? `${base} ${letter(n)}` : base,
      dwellerIds: ids,
    };
  });
}

/** Map of dweller serializeId -> the occupied room whose `dwellers` array contains it. */
export function buildRoomAssignments(s: SaveJson | null | undefined): Map<number, RoomEntry> {
  const map = new Map<number, RoomEntry>();
  for (const entry of getOccupiedRooms(s)) {
    for (const id of entry.dwellerIds) {
      if (!map.has(id)) map.set(id, entry);
    }
  }
  return map;
}

export function getDwellerRoom(s: SaveJson | null | undefined, serializeId: number): Room | null {
  return getRooms(s).find((r) => Array.isArray(r.dwellers) && r.dwellers.includes(serializeId)) ?? null;
}

export function roomDisplayName(room: Room): string {
  return ROOM_NAMES[room.type] ?? room.type.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
}

/** e.g. "Diner · Lv 3 · 3-wide" (merge suffix omitted for single rooms). */
export function roomLabel(room: Room, name: string = roomDisplayName(room)): string {
  const parts = [name];
  if (typeof room.level === 'number') parts.push(`Lv ${room.level}`);
  if (typeof room.mergeLevel === 'number' && room.mergeLevel > 1) parts.push(`${room.mergeLevel}-wide`);
  return parts.join(' · ');
}

/** Remove a dweller's serializeId from every room's `dwellers` array. */
export function unassignDweller(s: SaveJson, serializeId: number): SaveJson {
  const rooms = getRooms(s);
  if (!rooms.some((r) => Array.isArray(r.dwellers) && r.dwellers.includes(serializeId))) return s;
  const next = rooms.map((r) =>
    Array.isArray(r.dwellers) && r.dwellers.includes(serializeId)
      ? { ...r, dwellers: r.dwellers.filter((id) => id !== serializeId) }
      : r,
  );
  return { ...s, vault: { ...(s.vault ?? {}), rooms: next } };
}
