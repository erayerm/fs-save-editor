import type { Dweller, Special } from '../types/save';
import { SPECIAL_ORDER } from '../types/save';
import type { Rgb } from './dwellerRender';
import { encodeArgb } from './colors';

export interface DwellerCustomization {
  hair?: string;
  outfitId?: string;
  /** Male facial-hair piece name, written to the save's `faceMask` key. `null` clears it. */
  facialHair?: string | null;
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

export function applyCustomization(d: Dweller, patch: DwellerCustomization): Dweller {
  const next = { ...(d as Record<string, unknown>) } as Record<string, unknown>;
  if (patch.hair !== undefined) next.hair = patch.hair;
  // Facial hair persists on the dweller's `faceMask` key (a piece name, or null for none).
  if (patch.facialHair !== undefined) next.faceMask = patch.facialHair;
  if (patch.outfitId !== undefined) {
    const cur = (next.equipedOutfit as Record<string, unknown>) ?? {};
    next.equipedOutfit = { ...cur, id: patch.outfitId };
  }
  if (patch.skinColor !== undefined) next.skinColor = encodeArgb(patch.skinColor);
  if (patch.hairColor !== undefined) next.hairColor = encodeArgb(patch.hairColor);
  if (patch.outfitColor !== undefined) next.outfitColor = encodeArgb(patch.outfitColor);
  return next as unknown as Dweller;
}

const clampStat = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

/** Min/max dweller level (matches the game's level table: 1..50). */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 50;

const clampLevel = (n: number) => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(n)));

/**
 * Set a dweller's level (1..50). The game's DwellerExperience reads `currentLevel`
 * directly on load (it does not recompute level from XP), so we set it explicitly
 * and reset `experienceValue` to 0. Zeroing XP is safe: the game only auto-levels
 * when `experienceValue` exceeds the next level's threshold, never the reverse, so
 * a high leftover XP value can't drag a freshly-lowered level back up. Pending
 * level-up flags are cleared too. Max health is recomputed by the game on load.
 */
export function setLevel(d: Dweller, level: number): Dweller {
  const lvl = clampLevel(level);
  const exp = (d.experience ?? {}) as Record<string, unknown>;
  return {
    ...d,
    experience: {
      ...exp,
      currentLevel: lvl,
      experienceValue: 0,
      needLvUp: false,
      accum: 0,
      storage: 0,
    },
  } as Dweller;
}

export function setStat(d: Dweller, stat: Special, value: number): Dweller {
  const i = SPECIAL_ORDER.indexOf(stat) + 1; // 1-based; slot 0 is placeholder
  const cur = d.stats?.stats ?? [];
  const stats = cur.map((s, idx) => (idx === i ? { ...s, value: clampStat(value) } : s));
  return { ...d, stats: { ...(d.stats ?? {}), stats } } as Dweller;
}

export function setName(d: Dweller, patch: { name?: string; lastName?: string }): Dweller {
  return {
    ...d,
    name: patch.name !== undefined ? patch.name.trim() : d.name,
    lastName: patch.lastName !== undefined ? patch.lastName.trim() : d.lastName,
  };
}

/**
 * Set female-dweller pregnancy flags. `pregnant` marks the dweller as expecting;
 * `babyReady` marks the pregnancy as ready to deliver. Both are top-level
 * booleans in the save. Only meaningful for female dwellers (gender 1).
 */
export function setPregnancy(
  d: Dweller,
  patch: { pregnant?: boolean; babyReady?: boolean },
): Dweller {
  const next = { ...(d as Record<string, unknown>) } as Record<string, unknown>;
  if (patch.pregnant !== undefined) next.pregnant = patch.pregnant;
  if (patch.babyReady !== undefined) next.babyReady = patch.babyReady;
  return next as unknown as Dweller;
}

export interface NewDwellerInput {
  name: string;
  lastName: string;
  /** 1 = female, 2 = male (matches the save's gender encoding). */
  gender: number;
}

const FIRST_NAMES_FEMALE = ['Alice', 'Emma', 'Olivia', 'Sophia', 'Ava', 'Mia', 'Grace', 'Nora', 'Ruby', 'Clara'];
const FIRST_NAMES_MALE = ['James', 'Liam', 'Noah', 'Lucas', 'Henry', 'Oscar', 'Walt', 'Cole', 'Max', 'Felix'];
const LAST_NAMES = ['Smith', 'Stone', 'Vance', 'Cross', 'Reed', 'Snow', 'Hale', 'Ward', 'Frost', 'Quinn', 'Mercer', 'Pike'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Generate a random name + gender for a new dweller. */
export function randomDwellerInput(): NewDwellerInput {
  const gender = Math.random() < 0.5 ? 1 : 2;
  const name = pick(gender === 1 ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE);
  return { name, lastName: pick(LAST_NAMES), gender };
}

/**
 * Build a fresh level-1 dweller positioned "at the vault door" rather than
 * inside the vault. In the save this is represented by `savedRoom: -1`
 * (no working room) with `assigned: false` — the game spawns such dwellers at
 * the entrance room. `serializeId` is the smallest positive integer not already
 * used by `existingIds`.
 */
export function createDwellerAtDoor(input: NewDwellerInput, existingIds: number[]): Dweller {
  let id = 1;
  const used = new Set(existingIds);
  while (used.has(id)) id += 1;

  const stat = () => ({ value: 1, mod: 0, exp: 0 });
  return {
    serializeId: id,
    name: input.name.trim() || 'New',
    lastName: input.lastName.trim() || 'Dweller',
    happiness: { happinessValue: 50 },
    health: { healthValue: 105, radiationValue: 0, permaDeath: false, lastLevelUpdated: 1, maxHealth: 105 },
    deathSource: 0,
    experience: { experienceValue: 0, currentLevel: 1, storage: 0, accum: 0, needLvUp: false, wastelandExperience: 0 },
    relations: { relations: [], partner: -1, lastPartner: -1, ascendants: [-1, -1, -1, -1, -1, -1] },
    gender: input.gender === 2 ? 2 : 1,
    stats: { stats: Array.from({ length: 8 }, stat) },
    pregnant: false,
    babyReady: false,
    assigned: false,
    sawIncident: false,
    WillGoToWasteland: false,
    WillBeEvicted: false,
    IsEvictedWaitingForFollowers: false,
    skinColor: 4294963175,
    hairColor: 4294967122,
    outfitColor: 4294967295,
    pendingExperienceReward: 0,
    hair: '1',
    equipedOutfit: { id: 'jumpsuit', type: 'Outfit', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    equipedWeapon: { id: 'Fist', type: 'Weapon', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    savedRoom: -1,
    wasTemporarilyAssigned: false,
    lastChildBorn: -1,
    rarity: 'Normal',
    deathTime: -1,
  } as unknown as Dweller;
}

export function setWeapon(d: Dweller, weaponId: string): Dweller {
  const cur = (d.equipedWeapon ?? { type: 'Weapon' }) as Record<string, unknown>;
  return { ...d, equipedWeapon: { ...cur, id: weaponId, type: 'Weapon' } } as Dweller;
}
