import type { Dweller, Special } from '../types/save';
import { SPECIAL_ORDER } from '../types/save';
import type { PetMeta } from '../types/pets';
import type { WeaponMeta } from '../types/weapons';
import { getHealth, MAX_LEVEL } from './dwellerEdit';
import { roomsForStat } from './rooms';

// ---------------------------------------------------------------------------
// Derived dweller stats for the stats panel. Formulas from the Fallout Wiki
// (Fallout Shelter SPECIAL / Endurance):
//  - Dwellers start with 105 HP at level 1.
//  - Each level-up adds 2.5 + 0.5 × Endurance (base + outfit, up to 17) HP.
//    It isn't retroactive, so level 50 ranges from 252 HP (END 1 throughout)
//    to 644 HP (END 17 throughout).
//  - Total Endurance 11+ makes the dweller immune to the radiation bursts
//    suffered while exploring the Wasteland.
// ---------------------------------------------------------------------------

export const BASE_HP = 105;
export const MAX_TOTAL_SPECIAL = 17;

export const hpPerLevel = (endurance: number) =>
  2.5 + 0.5 * Math.max(1, Math.min(MAX_TOTAL_SPECIAL, endurance));

/** Max HP at `level` for a dweller that had `endurance` at every level-up. */
export const maxHpAt = (level: number, endurance: number) =>
  BASE_HP + Math.max(0, level - 1) * hpPerLevel(endurance);

export const WASTELAND_RAD_IMMUNE_END = 11;

/** What each SPECIAL does beyond room production (Fallout Wiki). */
export const SPECIAL_EFFECTS: Record<Special, string> = {
  S: 'Attack and defense in combat',
  P: 'Slower critical-hit arrow in quests; finding items in the Wasteland',
  E: 'HP gained per level-up; radiation resistance (immune to Wasteland bursts at 11+)',
  C: 'Romance speed in Living Quarters; Radio Studio; meeting friendly people in the Wasteland',
  I: 'Stimpak and RadAway production',
  A: 'Fire rate in combat; escaping fights',
  L: 'Rush and bonus-caps chance; better loot; faster critical meter in quests',
};

const PET_BONUS_LABELS: Record<string, (v: number) => string> = {
  AddMaxHP: (v) => `+${v}% Health`,
  DamageBoost: (v) => `+${v} Damage`,
  Resistance: (v) => `${v}% Damage Resistance`,
  XPBoost: (v) => `+${v}% XP`,
  HappinessBoost: (v) => `+${v}% Happiness`,
  HealingBoost: (v) => `x${v} Healing Speed`,
  RadHealingBoost: (v) => `x${v} Rad Healing Speed`,
  TrainingBoost: (v) => `-${v}% Training Time`,
  TrainingNonStopBoost: (v) => `-${v}% Training Time (Continuous)`,
  ChildSpecialBoost: (v) => `+${v} Child SPECIALs`,
  ChildMultiplier: (v) => `${v}% Twins Chance`,
  ObjectiveMultiplier: (v) => `x${v} Objective Completion`,
  MysteriousMagnet: (v) => `x${v} Stranger Chance`,
  WastelandCapsBoost: (v) => `+${v}% Wasteland Caps`,
  WastelandJunkBoost: (v) => `+${v}% Wasteland Junk`,
  WastelandItemBoost: (v) => `+${v}% Wasteland Weapons & Outfits`,
  FasterWastelandReturnSpeed: (v) => `x${v} Wasteland Return Speed`,
  FasterCrafting: (v) => `-${v}% Crafting Time`,
  CheaperCrafting: (v) => `-${v}% Crafting Cost`,
  FasterAndCheaperCrafting: (v) => `-${v}% Crafting Time & Cost`,
};

const PET_BONUS_NOTES: Record<string, string> = {
  AddMaxHP: 'Raises max HP while the pet is equipped. It is not permanent.',
  DamageBoost: 'Added to the weapon damage.',
  Resistance: 'Reduces the damage the dweller takes.',
  XPBoost: 'More experience from working, training and exploring.',
  HappinessBoost: "Raises the dweller's happiness.",
  HealingBoost: 'Speeds up healing.',
  RadHealingBoost: 'Speeds up radiation healing.',
  TrainingBoost: 'Shortens SPECIAL training in training rooms.',
  TrainingNonStopBoost: 'Shortens SPECIAL training while the dweller trains continuously.',
  ChildSpecialBoost: "Children born to this dweller start with higher SPECIAL.",
  ChildMultiplier: 'Chance of twins when this dweller has a baby.',
  ObjectiveMultiplier: 'Objectives progress faster from what this dweller does.',
  MysteriousMagnet: 'The Mysterious Stranger appears more often.',
  WastelandCapsBoost: 'Applies while exploring the Wasteland.',
  WastelandJunkBoost: 'Applies while exploring the Wasteland.',
  WastelandItemBoost: 'Applies while exploring the Wasteland.',
  FasterWastelandReturnSpeed: 'Comes back from the Wasteland faster.',
  FasterCrafting: 'Applies when crafting in a workshop.',
  CheaperCrafting: 'Applies when crafting in a workshop.',
  FasterAndCheaperCrafting: 'Applies when crafting in a workshop.',
};

export const petBonusNote = (bonus: string): string | null => PET_BONUS_NOTES[bonus] ?? null;

export function petBonusLabel(bonus: string, value: number): string {
  const fmt = PET_BONUS_LABELS[bonus];
  return fmt ? fmt(value) : `${bonus} ${value}`;
}

export interface SpecialRow {
  letter: Special;
  base: number;
  outfit: number;
  /** base + outfit, capped at MAX_TOTAL_SPECIAL. */
  total: number;
  rooms: string[];
  training: string[];
  effect: string;
}

export interface PetInfo {
  id: string;
  name: string;
  bonus: string;
  value: number;
  label: string;
}

export interface DwellerStats {
  level: number;
  special: SpecialRow[];
  health: {
    current: number;
    max: number;
    radiation: number;
    endurance: number;
    perLevel: number;
    levelsLeft: number;
    /** Max HP at level 50 if Endurance stays as it is now. */
    projectedMax: number;
    /** Max HP range at the current level: END 1 vs END 17 at every level-up. */
    minAtLevel: number;
    idealAtLevel: number;
    /** Pet "+X% Health" multiplier (1 when none). */
    petMultiplier: number;
    radImmune: boolean;
  };
  weapon: { id: string; name: string; min: number; max: number } | null;
  pet: PetInfo | null;
  petDamage: number;
  petResistance: number;
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function computeDwellerStats(
  d: Dweller,
  outfitBonus: Partial<Record<Special, number>>,
  catalogs: { weapon?: WeaponMeta | null; pet?: PetMeta | null } = {},
): DwellerStats {
  const level = num(d.experience?.currentLevel, 1);

  const special = SPECIAL_ORDER.map((letter, i): SpecialRow => {
    const base = num(d.stats?.stats?.[i + 1]?.value, 1);
    const outfit = outfitBonus[letter] ?? 0;
    const { work, training } = roomsForStat(letter);
    return {
      letter, base, outfit,
      total: Math.min(MAX_TOTAL_SPECIAL, base + outfit),
      rooms: work, training,
      effect: SPECIAL_EFFECTS[letter],
    };
  });

  const petRef = d.equippedPet as { id?: unknown; extraData?: { bonus?: unknown; bonusValue?: unknown } } | undefined;
  let pet: PetInfo | null = null;
  if (typeof petRef?.id === 'string') {
    const bonus = typeof petRef.extraData?.bonus === 'string' ? petRef.extraData.bonus : catalogs.pet?.bonus ?? '';
    const value = num(petRef.extraData?.bonusValue, catalogs.pet?.bonusValue ?? 0);
    pet = { id: petRef.id, name: catalogs.pet?.name ?? petRef.id, bonus, value, label: petBonusLabel(bonus, value) };
  }
  const petValue = (bonus: string) => (pet?.bonus === bonus ? pet.value : 0);

  const { health: current, maxHealth: max, radiation } = getHealth(d);
  const endurance = special.find((s) => s.letter === 'E')!.total;
  const perLevel = hpPerLevel(endurance);
  const levelsLeft = Math.max(0, MAX_LEVEL - Math.max(1, level));

  const weaponId = d.equipedWeapon?.id;
  const weapon = typeof weaponId === 'string'
    ? {
        id: weaponId,
        name: catalogs.weapon?.name ?? weaponId,
        min: catalogs.weapon?.damageMin ?? 0,
        max: catalogs.weapon?.damageMax ?? 0,
      }
    : null;

  return {
    level,
    special,
    health: {
      current, max, radiation, endurance, perLevel, levelsLeft,
      projectedMax: max + levelsLeft * perLevel,
      minAtLevel: maxHpAt(level, 1),
      idealAtLevel: maxHpAt(level, MAX_TOTAL_SPECIAL),
      petMultiplier: 1 + petValue('AddMaxHP') / 100,
      radImmune: endurance >= WASTELAND_RAD_IMMUNE_END,
    },
    weapon,
    pet,
    petDamage: petValue('DamageBoost'),
    petResistance: petValue('Resistance'),
  };
}
