// Colors come pre-decoded from ARGB ints into 0..255 byte channels (see adapter in Task 7).
export interface Rgb {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a?: number; // 0..255, optional
}

// Minimal dweller shape this module reads. References are by NAME, not GUID.
export interface RenderableDweller {
  gender: number;            // 1 = female, 2 = male
  isChild?: boolean;         // experience.currentLevel === 0 — not customizable
  hairName?: string;         // d.hair  (e.g. "21", "hair_CooperHoward")
  facialHair?: string;       // d.faceMask  (male beard/mustache piece name, e.g. "f_hair_11")
  outfitName?: string;       // d.equipedOutfit.id  (e.g. "jumpsuit")
  happinessValue?: number;   // 0..100 — face is derived from this
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

// Children (experience.currentLevel === 0) are not customizable in-game; we leave
// their appearance untouched and disable editing for them. NOTE: this is only a
// fallback — the authoritative child marker lives in the vault's living-quarters
// rooms (see childDwellerIds), because a child in mid-childhood is level 1, not 0.
export function isChildDweller(raw: { experience?: { currentLevel?: number } }): boolean {
  return raw.experience?.currentLevel === 0;
}

// Set of dweller serializeIds the game currently treats as children. The game
// stores child status as a separate DwellerChild record ({ taskID, dwellerID,
// notificationID }) inside a living-quarters room's `children` array — NOT on the
// dweller object — so a child (e.g. a mid-childhood level-1 dweller) is only
// identifiable by scanning vault.rooms[*].children[*].dwellerID. Cached per save
// object so repeated calls (one per card) are cheap.
const childIdCache = new WeakMap<object, Set<number>>();
export function childDwellerIds(save: unknown): Set<number> {
  if (!save || typeof save !== 'object') return new Set();
  const cached = childIdCache.get(save as object);
  if (cached) return cached;
  const ids = new Set<number>();
  const rooms = (save as { vault?: { rooms?: unknown } }).vault?.rooms;
  if (Array.isArray(rooms)) {
    for (const room of rooms) {
      const children = (room as { children?: unknown })?.children;
      if (Array.isArray(children)) {
        for (const c of children) {
          const id = (c as { dwellerID?: unknown })?.dwellerID;
          if (typeof id === 'number') ids.add(id);
        }
      }
    }
  }
  childIdCache.set(save as object, ids);
  return ids;
}

// Face is not stored; derive it from happiness (from DwellerFace.cs thresholds).
export function faceNameForHappiness(happiness: number | undefined): string {
  const h = happiness ?? 100;
  if (h < 50) return 'sad';
  if (h <= 75) return 'neutral';
  return 'smile';
}
