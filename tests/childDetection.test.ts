import { describe, it, expect } from 'vitest';
import { isChildDweller, childDwellerIds } from '../src/lib/dwellerRender';

describe('isChildDweller', () => {
  it('true when experience.currentLevel is 0', () => {
    expect(isChildDweller({ experience: { currentLevel: 0 } })).toBe(true);
  });
  it('false for adults (level >= 1)', () => {
    expect(isChildDweller({ experience: { currentLevel: 1 } })).toBe(false);
  });
  it('false when level missing (assume adult)', () => {
    expect(isChildDweller({})).toBe(false);
  });
});

describe('childDwellerIds', () => {
  it('collects dwellerIDs from vault.rooms[*].children (a level-1 child is detected here)', () => {
    const save = {
      vault: {
        rooms: [
          { children: [{ taskID: 543, dwellerID: 27, notificationID: -1 }] },
          { children: [] },
          { children: [{ dwellerID: 31 }] },
          {},
        ],
      },
    };
    const ids = childDwellerIds(save);
    expect(ids.has(27)).toBe(true);
    expect(ids.has(31)).toBe(true);
    expect(ids.has(16)).toBe(false);
    expect(ids.size).toBe(2);
  });

  it('returns an empty set for saves without rooms/children', () => {
    expect(childDwellerIds(null).size).toBe(0);
    expect(childDwellerIds({}).size).toBe(0);
    expect(childDwellerIds({ vault: {} }).size).toBe(0);
    expect(childDwellerIds({ vault: { rooms: [] } }).size).toBe(0);
  });
});
