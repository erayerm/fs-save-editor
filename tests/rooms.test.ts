import { describe, it, expect } from 'vitest';
import {
  getRooms, buildRoomAssignments, getOccupiedRooms, getDwellerRoom, roomDisplayName, roomLabel, roomInfo, unassignDweller,
} from '../src/lib/rooms';

const dwellers = (...ids: number[]) => ({ dwellers: ids.map((serializeId) => ({ serializeId })) });

const save = () => ({
  dwellers: dwellers(3, 4, 14, 30),
  vault: {
    rooms: [
      { type: 'Elevator', class: 'Utility', mergeLevel: 1, level: 1, dwellers: [] },
      { type: 'Cafeteria', class: 'Production', mergeLevel: 3, level: 3, dwellers: [3, 4, 14] },
      { type: 'MedBay', class: 'Consumable', mergeLevel: 1, level: 1, dwellers: [30] },
    ],
  },
} as any);

describe('rooms', () => {
  it('returns an empty list when the save has no rooms', () => {
    expect(getRooms({ dwellers: { dwellers: [] } } as any)).toEqual([]);
    expect(getRooms(null)).toEqual([]);
  });

  it('maps each serializeId to the room whose dwellers array contains it', () => {
    const map = buildRoomAssignments(save());
    expect(map.get(3)?.room.type).toBe('Cafeteria');
    expect(map.get(14)?.room.type).toBe('Cafeteria');
    expect(map.get(30)?.room.type).toBe('MedBay');
    expect(map.has(99)).toBe(false);
  });

  it('keeps same-type rooms separate, lettered by floor then column', () => {
    const s = {
      dwellers: dwellers(1, 2, 3, 4, 5, 6),
      vault: {
        rooms: [
          { type: 'Geothermal', row: 5, col: 9, deserializeID: 11, dwellers: [1, 2] },
          { type: 'Geothermal', row: 2, col: 9, deserializeID: 12, dwellers: [3, 4, 5] },
          { type: 'Geothermal', row: 1, col: 0, deserializeID: 13, dwellers: [] },
          { type: 'MedBay', row: 0, col: 3, deserializeID: 14, dwellers: [6] },
        ],
      },
    } as any;
    const entries = getOccupiedRooms(s);
    expect(entries.map((e) => [e.key, e.name, e.dwellerIds.length])).toEqual([
      ['14', 'Medbay', 1],
      ['12', 'Power Generator A', 3],
      ['11', 'Power Generator B', 2],
    ]);
    expect(buildRoomAssignments(s).get(1)?.name).toBe('Power Generator B');
  });

  it('ignores room entries for dwellers that are not in the save', () => {
    const s = {
      dwellers: dwellers(1),
      vault: {
        rooms: [
          { type: 'Cafeteria', deserializeID: 1, dwellers: [1, 50, 51] },
          { type: 'MedBay', deserializeID: 2, dwellers: [60] },
        ],
      },
    } as any;
    expect(getOccupiedRooms(s).map((e) => [e.name, e.dwellerIds])).toEqual([['Diner', [1]]]);
  });

  it('finds a single dweller room, or null when unassigned', () => {
    expect(getDwellerRoom(save(), 4)?.type).toBe('Cafeteria');
    expect(getDwellerRoom(save(), 99)).toBeNull();
  });

  it('uses in-game names and falls back to splitting unknown types', () => {
    expect(roomDisplayName({ type: 'Cafeteria' })).toBe('Diner');
    expect(roomDisplayName({ type: 'Energy2' })).toBe('Nuclear Reactor');
    expect(roomDisplayName({ type: 'SomeNewRoom' })).toBe('Some New Room');
  });

  it('labels with level and merge width', () => {
    expect(roomLabel({ type: 'Cafeteria', level: 3, mergeLevel: 3 })).toBe('Diner · Lv 3 · 3-wide');
    expect(roomLabel({ type: 'MedBay', level: 1, mergeLevel: 1 })).toBe('Medbay · Lv 1');
  });

  it('describes what a room does, its stat, work slots and floor', () => {
    expect(roomInfo({ type: 'Cafeteria', class: 'Production', mergeLevel: 2, row: 4 })).toEqual({
      role: 'Produces Food', stat: 'A', capacity: 4, floor: 5,
    });
    expect(roomInfo({ type: 'Casino', class: 'Training', mergeLevel: 3, row: 0 }).capacity).toBe(6);
    expect(roomInfo({ type: 'LivingQuarters', class: 'Facility', mergeLevel: 3 }).capacity).toBeNull();
    expect(roomInfo({ type: 'BarberShop', class: 'Training', mergeLevel: 2 }).capacity).toBeNull();
  });

  it('unassignDweller removes the id immutably', () => {
    const s = save();
    const s2 = unassignDweller(s, 4);
    expect(s2.vault.rooms[1].dwellers).toEqual([3, 14]);
    expect(s.vault.rooms[1].dwellers).toEqual([3, 4, 14]);
    expect(unassignDweller(s, 99)).toBe(s);
  });
});
