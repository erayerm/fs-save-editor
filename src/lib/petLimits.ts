import type { Dweller, SaveJson } from '../types/save';
import { getDwellerRoom, getRooms, roomDisplayName, type Room } from './rooms';
import { getStashItems } from './stash';

// ---------------------------------------------------------------------------
// Pet limits. A room holds at most one pet per merged segment (single 1,
// double 2, triple 3), counting the pets of the dwellers assigned to it. A
// vault owns at most MAX_VAULT_PETS pets, equipped and stashed together.
// ---------------------------------------------------------------------------

export const MAX_VAULT_PETS = 100;

const ROOM_SIZES = ['single', 'double', 'triple'] as const;

/** Max pets in a room: 1 / 2 / 3 for a single / double / triple room (its merge width). */
export function roomPetCapacity(room: Room): number {
  return Math.min(3, Math.max(1, Math.round(Number(room.mergeLevel) || 1)));
}

/** "single", "double" or "triple". */
export const roomSizeName = (room: Room) => ROOM_SIZES[roomPetCapacity(room) - 1];

export function hasPet(d: Dweller | null | undefined): boolean {
  return typeof (d?.equippedPet as { id?: unknown } | undefined)?.id === 'string';
}

/** Pets the vault owns: every equipped pet plus every pet in the stash. */
export function vaultPetCount(s: SaveJson): number {
  return s.dwellers.dwellers.filter(hasPet).length
    + getStashItems(s).filter((it) => it.type === 'Pet').length;
}

const petOwners = (s: SaveJson) =>
  new Set(s.dwellers.dwellers.filter(hasPet).map((d) => d.serializeId));

const countIn = (room: Room, owners: Set<number>) =>
  Array.isArray(room.dwellers) ? new Set(room.dwellers.filter((id) => owners.has(id))).size : 0;

/** Pets carried by the dwellers assigned to `room`. */
export function roomPetCount(s: SaveJson, room: Room): number {
  return countIn(room, petOwners(s));
}

export const VAULT_PETS_FULL = `The vault already owns ${MAX_VAULT_PETS} pets, the most a vault can have.`;

const roomFullMessage = (room: Room) => {
  const cap = roomPetCapacity(room);
  return `${roomDisplayName(room)} is a ${roomSizeName(room)} room and holds at most ${cap} pet${cap === 1 ? '' : 's'}.`;
};

/** Whether one more pet fits in the vault. */
export function vaultHasPetRoom(s: SaveJson): boolean {
  return vaultPetCount(s) < MAX_VAULT_PETS;
}

/**
 * Why dweller `id` can't start carrying a pet (its room is full), or null. A
 * dweller that already has a pet, or isn't assigned to a room, is never blocked.
 */
export function roomPetError(s: SaveJson, id: number): string | null {
  const d = s.dwellers.dwellers.find((x) => x.serializeId === id);
  if (!d || hasPet(d)) return null;
  const room = getDwellerRoom(s, id);
  if (!room || roomPetCount(s, room) < roomPetCapacity(room)) return null;
  return roomFullMessage(room);
}

/**
 * Why going from `before` to `after` breaks a pet limit, or null. Only growth
 * is rejected: a save that is already over a limit can still be edited as long
 * as the edit doesn't add to the overflow.
 */
export function petLimitError(before: SaveJson, after: SaveJson): string | null {
  const total = vaultPetCount(after);
  if (total > MAX_VAULT_PETS && total > vaultPetCount(before)) return VAULT_PETS_FULL;

  const ownersBefore = petOwners(before);
  const ownersAfter = petOwners(after);
  const roomsBefore = getRooms(before);
  const roomsAfter = getRooms(after);
  for (let i = 0; i < roomsAfter.length; i++) {
    const room = roomsAfter[i];
    const count = countIn(room, ownersAfter);
    if (count <= roomPetCapacity(room)) continue;
    const prev = roomsBefore[i] ? countIn(roomsBefore[i], ownersBefore) : 0;
    if (count > prev) return roomFullMessage(room);
  }
  return null;
}
