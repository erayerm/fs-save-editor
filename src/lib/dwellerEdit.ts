import type { Dweller, Special } from '../types/save';
import type { LegendaryMeta } from '../types/legendary';
import type { PetMeta } from '../types/pets';
import type { SpriteIndex } from '../types/pieces';
import { SPECIAL_ORDER } from '../types/save';
import type { Rgb } from './dwellerRender';
import { encodeArgb } from './colors';
import { hairValidForGender, outfitValidForGender, defaultHairFor, faceMaskValidForGender } from './spriteIndex';

export interface DwellerCustomization {
  hair?: string;
  outfitId?: string;
  /** faceMask piece name (facial hair, glasses, wrinkles, etc.), written to the save's `faceMask` key. `null` clears it. */
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

/** Smallest positive integer not present in `existingIds`. */
function nextFreeId(existingIds: number[]): number {
  const used = new Set(existingIds);
  let id = 1;
  while (used.has(id)) id += 1;
  return id;
}

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

/**
 * Highest max health a dweller can reach in-game: level 50 with 17 Endurance
 * (10 base + 7 from an outfit) at every level-up.
 */
export const MAX_HEALTH = 644;
export const MAX_HAPPINESS = 100;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface DwellerHealth {
  health: number;
  maxHealth: number;
  radiation: number;
}

export function getHealth(d: Dweller): DwellerHealth {
  const h = (d.health ?? {}) as Record<string, unknown>;
  const maxHealth = finite(h.maxHealth) ? h.maxHealth : 105;
  return {
    maxHealth,
    health: finite(h.healthValue) ? h.healthValue : maxHealth,
    radiation: finite(h.radiationValue) ? h.radiationValue : 0,
  };
}

/**
 * Set health, max health and/or radiation (`health.healthValue`, `maxHealth`,
 * `radiationValue`). Radiation eats into max health, so health is kept at or
 * below maxHealth − radiation, and never below 1 (0 means dead). Non-finite
 * patch values are ignored. `lastLevelUpdated` is left alone so the game still
 * adds health for any levels it hasn't processed yet.
 */
export function setHealth(d: Dweller, patch: Partial<DwellerHealth>): Dweller {
  const cur = getHealth(d);
  const maxHealth = round1(clamp(finite(patch.maxHealth) ? patch.maxHealth : cur.maxHealth, 1, MAX_HEALTH));
  const radiation = round1(clamp(finite(patch.radiation) ? patch.radiation : cur.radiation, 0, maxHealth - 1));
  const health = round1(clamp(finite(patch.health) ? patch.health : cur.health, 1, maxHealth - radiation));
  return {
    ...d,
    health: {
      ...((d.health ?? {}) as Record<string, unknown>),
      healthValue: health,
      maxHealth,
      radiationValue: radiation,
    },
  } as Dweller;
}

/** Full health and no radiation. */
export function healDweller(d: Dweller): Dweller {
  const { maxHealth } = getHealth(d);
  return setHealth(d, { radiation: 0, health: maxHealth });
}

export function getHappiness(d: Dweller): number {
  const v = (d.happiness as { happinessValue?: unknown } | undefined)?.happinessValue;
  return finite(v) ? v : MAX_HAPPINESS;
}

/** Set `happiness.happinessValue` (0..100). The game keeps adjusting it as the dweller lives. */
export function setHappiness(d: Dweller, value: number): Dweller {
  if (!finite(value)) return d;
  return {
    ...d,
    happiness: {
      ...((d.happiness ?? {}) as Record<string, unknown>),
      happinessValue: clamp(Math.round(value), 0, MAX_HAPPINESS),
    },
  } as Dweller;
}

/** Rarity tiers a dweller can be set to. Real saves use both "Normal" and "Common" for common dwellers. */
export const DWELLER_RARITIES = ['Common', 'Rare', 'Legendary'] as const;
export type DwellerRarity = (typeof DWELLER_RARITIES)[number];

export function getRarity(d: Dweller): DwellerRarity {
  return d.rarity === 'Rare' || d.rarity === 'Legendary' ? d.rarity : 'Common';
}

/** Set the rarity tag. A "Normal" dweller set to Common keeps "Normal" (both mean common). */
export function setRarity(d: Dweller, rarity: DwellerRarity): Dweller {
  if (getRarity(d) === rarity) return d;
  return { ...d, rarity };
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
  const id = nextFreeId(existingIds);

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

/**
 * Equip a pet. Pets live on `equippedPet` (note the double-p key, distinct from
 * the single-p `equipedWeapon` / `equipedOutfit`). `extraData` carries the
 * pet's unique name and its single bonus effect + value.
 */
export function setPet(d: Dweller, pet: PetMeta): Dweller {
  return {
    ...d,
    equippedPet: {
      id: pet.id,
      type: 'Pet',
      hasBeenAssigned: false,
      hasRandonWeaponBeenAssigned: false,
      extraData: { uniqueName: pet.uniqueName, bonus: pet.bonus, bonusValue: pet.bonusValue },
    },
  } as unknown as Dweller;
}

/** Game's legendary lunchbox level range (GameParameters m_legendaryDwellerInitialLevel). */
export const LEGENDARY_MIN_LEVEL = 20;
export const LEGENDARY_MAX_LEVEL = 45;

const randomLegendaryLevel = () =>
  LEGENDARY_MIN_LEVEL + Math.floor(Math.random() * (LEGENDARY_MAX_LEVEL - LEGENDARY_MIN_LEVEL + 1));

/**
 * Build a save-shaped legendary dweller from a roster entry, positioned at the
 * vault door (`savedRoom: -1`, `assigned: false`) like a fresh arrival. Level
 * defaults to a random value in [LEGENDARY_MIN_LEVEL, LEGENDARY_MAX_LEVEL]
 * (matching the game's lunchbox behavior); pass `level` to force one (tests).
 * Health mirrors the game's observed `105 + (level-1)*6`; the game recomputes it
 * on the next level-up regardless. SPECIAL base values come from the roster with
 * mod 0 (equipment mods are recalculated by the game on load).
 */
export function createLegendaryDweller(
  entry: LegendaryMeta,
  existingIds: number[],
  level?: number,
): Dweller {
  if (entry.special.length !== 7) {
    throw new Error(`${entry.uniqueData}: expected 7 SPECIAL values, got ${entry.special.length}`);
  }

  const id = nextFreeId(existingIds);
  const lvl = clampLevel(level ?? randomLegendaryLevel());
  const maxHealth = 105 + (lvl - 1) * 6;

  const stats = [
    { value: 1, mod: 0, exp: 0 }, // slot 0 placeholder (mirrors createDwellerAtDoor)
    ...entry.special.map((value) => ({ value, mod: 0, exp: 0 })),
  ];

  const d: Record<string, unknown> = {
    serializeId: id,
    name: entry.name.trim() || entry.uniqueData,
    lastName: entry.lastName,
    happiness: { happinessValue: 75 },
    health: { healthValue: maxHealth, radiationValue: 0, permaDeath: false, lastLevelUpdated: lvl, maxHealth },
    deathSource: 0,
    experience: { experienceValue: 0, currentLevel: lvl, storage: 0, accum: 0, needLvUp: false, wastelandExperience: 0 },
    relations: { relations: [], partner: -1, lastPartner: -1, ascendants: [-1, -1, -1, -1, -1, -1] },
    gender: entry.gender === 2 ? 2 : 1,
    stats: { stats },
    pregnant: false,
    babyReady: false,
    assigned: false,
    sawIncident: false,
    WillGoToWasteland: false,
    WillBeEvicted: false,
    IsEvictedWaitingForFollowers: false,
    skinColor: entry.skinColor,
    hairColor: entry.hairColor,
    outfitColor: 4294967295,
    pendingExperienceReward: 0,
    uniqueData: entry.uniqueData,
    equipedOutfit: { id: entry.outfitId, type: 'Outfit', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    equipedWeapon: { id: entry.weaponId || 'Fist', type: 'Weapon', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    savedRoom: -1,
    wasTemporarilyAssigned: false,
    lastChildBorn: -1,
    rarity: 'Legendary',
    deathTime: -1,
  };
  if (entry.hair !== null) d.hair = entry.hair;
  if (entry.faceMask !== null) d.faceMask = entry.faceMask;

  return d as unknown as Dweller;
}

/** Remove a dweller's pet. */
export function clearPet(d: Dweller): Dweller {
  const next = { ...(d as Record<string, unknown>) };
  delete next.equippedPet;
  return next as unknown as Dweller;
}

export function setWeapon(d: Dweller, weaponId: string): Dweller {
  const cur = (d.equipedWeapon ?? { type: 'Weapon' }) as Record<string, unknown>;
  return { ...d, equipedWeapon: { ...cur, id: weaponId, type: 'Weapon' } } as Dweller;
}

/**
 * Set a dweller's gender (1 = female, 2 = male). Any non-2 value becomes female.
 *
 * Hair and outfits carry separate male/female art, and many pieces are
 * gender-specific (e.g. the Action Wedding Dress is female-only). When `idx` is
 * supplied, any gender-specific item the dweller is wearing that has no art for
 * the new gender is reset to its default — hair to the gender's default piece,
 * outfit to the vault jumpsuit. A faceMask piece (facial hair, glasses, etc.) is
 * kept only if it has art for the new gender, and cleared otherwise. Without
 * `idx`, only the gender flag changes.
 */
export function setGender(d: Dweller, gender: number, idx?: SpriteIndex): Dweller {
  const g = gender === 2 ? 2 : 1;
  const next = { ...(d as Record<string, unknown>), gender: g } as Record<string, unknown>;
  if (!idx) return next as unknown as Dweller;

  const gName: 'male' | 'female' = g === 2 ? 'male' : 'female';

  const hair = next.hair;
  if (typeof hair === 'string' && !hairValidForGender(idx, hair, gName)) {
    next.hair = defaultHairFor(idx, gName);
  }

  const outfit = next.equipedOutfit as Record<string, unknown> | undefined;
  if (outfit && typeof outfit.id === 'string' && !outfitValidForGender(idx, outfit.id, gName)) {
    next.equipedOutfit = { ...outfit, id: 'jumpsuit' };
  }

  // faceMask (facial hair / glasses / wrinkles / etc.) is a single gendered slot.
  // Keep it only if a piece with that name exists for the new gender; otherwise
  // clear it (e.g. a male-only beard on a dweller switched to female).
  const fm = next.faceMask;
  if (typeof fm === 'string' && !faceMaskValidForGender(idx, fm, gName)) {
    next.faceMask = null;
  }

  return next as unknown as Dweller;
}
