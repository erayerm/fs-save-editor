import type { Dweller, SaveJson } from '../types/save';
import { childDwellerIds, isChildDweller } from './dwellerRender';
import { getRooms } from './rooms';
import { getStashItems, stashCapacity, isDefaultGear } from './stash';
import { getBoxCount, BOX_TYPES, getVaultMode, type VaultMode } from './vaultEdit';
import { hasPet, vaultPetCount, MAX_VAULT_PETS } from './petLimits';

// ---------------------------------------------------------------------------
// Read-only summary of a whole save for the Vault Settings overview.
// ---------------------------------------------------------------------------

export const MAX_DWELLER_LEVEL = 50;
const MAX_SPECIAL = 10;

/** .NET DateTime ticks (100 ns since 0001-01-01) at the Unix epoch. */
const TICKS_AT_UNIX_EPOCH = 621355968000000000;

function ticksToDate(ticks: unknown): Date | null {
  if (typeof ticks !== 'number' || ticks <= TICKS_AT_UNIX_EPOCH) return null;
  const d = new Date((ticks - TICKS_AT_UNIX_EPOCH) / 10000);
  return isNaN(d.getTime()) ? null : d;
}

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

export interface DwellerSummary {
  total: number;
  male: number;
  female: number;
  adults: number;
  children: number;
  avgLevel: number;
  maxLevel: number;
  /** Adults at MAX_DWELLER_LEVEL. */
  atMaxLevel: number;
  avgHappiness: number;
  /** Every SPECIAL at 10 or more (base value, outfit bonuses excluded). */
  maxedSpecial: number;
  pregnant: number;
  withPet: number;
  /** Non-default weapon / outfit equipped. */
  armed: number;
  dressed: number;
  /** Listed in a room's `dwellers` array. */
  assigned: number;
  rarity: { common: number; rare: number; legendary: number };
}

export interface RoomSummary {
  total: number;
  /** Room count per save `class` (Production, Training, …), sorted by count. */
  byClass: { name: string; count: number }[];
  floors: number;
  maxUpgraded: number;
}

export interface InventorySummary {
  stashUsed: number;
  stashCapacity: number;
  weapons: number;
  outfits: number;
  pets: number;
  junk: number;
  petsOwned: number;
  petsMax: number;
}

export interface LifetimeSummary {
  totalDwellers: number | null;
  babiesBorn: number | null;
  deadDwellers: number | null;
  levelsGained: number | null;
  lunchboxesOpened: number | null;
  incidentsStopped: number | null;
  firesExtinguished: number | null;
  rushes: { ok: number; failed: number } | null;
  craftedItems: number | null;
  questsCompleted: number | null;
}

export interface VaultOverviewData {
  mode: VaultMode;
  appVersion: string | null;
  deviceName: string | null;
  createdAt: Date | null;
  savedAt: Date | null;
  dwellers: DwellerSummary;
  resources: { key: string; label: string; value: number }[];
  rooms: RoomSummary;
  inventory: InventorySummary;
  mrHandies: number;
  wastelandTeams: number;
  lifetime: LifetimeSummary;
}

const RESOURCE_LABELS: [string, string][] = [
  ['Nuka', 'Caps'],
  ['Food', 'Food'],
  ['Energy', 'Power'],
  ['Water', 'Water'],
  ['StimPack', 'Stimpaks'],
  ['RadAway', 'RadAway'],
  ['NukaColaQuantum', 'Nuka-Cola Quantum'],
];

function summarizeDwellers(s: SaveJson): DwellerSummary {
  const dwellers: Dweller[] = s.dwellers?.dwellers ?? [];
  const childIds = childDwellerIds(s);
  const assignedIds = new Set<number>();
  for (const room of getRooms(s)) {
    if (Array.isArray(room.dwellers)) room.dwellers.forEach((id) => assignedIds.add(id));
  }

  const out: DwellerSummary = {
    total: dwellers.length, male: 0, female: 0, adults: 0, children: 0,
    avgLevel: 0, maxLevel: 0, atMaxLevel: 0, avgHappiness: 0, maxedSpecial: 0,
    pregnant: 0, withPet: 0, armed: 0, dressed: 0, assigned: 0,
    rarity: { common: 0, rare: 0, legendary: 0 },
  };
  let levelSum = 0;
  let happinessSum = 0;

  for (const d of dwellers) {
    const raw = d as Record<string, any>;
    if (d.gender === 1) out.female++;
    else if (d.gender === 2) out.male++;

    const isChild = isChildDweller(d) || childIds.has(d.serializeId);
    if (isChild) out.children++;
    else out.adults++;

    const level = num(d.experience?.currentLevel);
    levelSum += level;
    out.maxLevel = Math.max(out.maxLevel, level);
    if (!isChild && level >= MAX_DWELLER_LEVEL) out.atMaxLevel++;

    happinessSum += num(raw.happiness?.happinessValue);

    const special = d.stats?.stats?.slice(1, 8) ?? [];
    if (special.length === 7 && special.every((st) => num(st?.value) >= MAX_SPECIAL)) out.maxedSpecial++;

    if (raw.pregnant === true) out.pregnant++;
    if (hasPet(d)) out.withPet++;
    if (d.equipedWeapon?.id && !isDefaultGear(d.equipedWeapon)) out.armed++;
    if (d.equipedOutfit?.id && !isDefaultGear(d.equipedOutfit)) out.dressed++;
    if (assignedIds.has(d.serializeId)) out.assigned++;

    if (d.rarity === 'Legendary') out.rarity.legendary++;
    else if (d.rarity === 'Rare') out.rarity.rare++;
    else out.rarity.common++;
  }

  if (dwellers.length > 0) {
    out.avgLevel = levelSum / dwellers.length;
    out.avgHappiness = happinessSum / dwellers.length;
  }
  return out;
}

function summarizeRooms(s: SaveJson): RoomSummary {
  const rooms = getRooms(s);
  const byClass = new Map<string, number>();
  let floors = 0;
  let maxUpgraded = 0;
  for (const r of rooms) {
    const cls = typeof r.class === 'string' ? r.class : 'Other';
    byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
    if (typeof r.row === 'number') floors = Math.max(floors, r.row + 1);
    if (r.level === 3) maxUpgraded++;
  }
  return {
    total: rooms.length,
    byClass: [...byClass].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    floors,
    maxUpgraded,
  };
}

function summarizeInventory(s: SaveJson): InventorySummary {
  const items = getStashItems(s);
  const count = (type: string) => items.filter((it) => it.type === type).length;
  return {
    stashUsed: items.length,
    stashCapacity: stashCapacity(s),
    weapons: count('Weapon'),
    outfits: count('Outfit'),
    pets: count('Pet'),
    junk: count('Junk'),
    petsOwned: vaultPetCount(s),
    petsMax: MAX_VAULT_PETS,
  };
}

function summarizeLifetime(s: SaveJson): LifetimeSummary {
  const stats = (s.StatsWindow as any)?.vaultData as Record<string, unknown> | undefined;
  const stat = (key: string) => (stats && typeof stats[key] === 'number' ? (stats[key] as number) : null);
  const sumOf = (keys: string[]) => {
    if (!stats) return null;
    return keys.reduce((sum, k) => sum + num(stats[k]), 0);
  };
  const incidentKeys = stats ? Object.keys(stats).filter((k) => k.startsWith('emergencyStop')) : [];
  const completed = (s.completedQuestDataManager as any)?.completedQuests;
  const ok = stat('successfulRushes');
  const failed = stat('failRushes');

  return {
    totalDwellers: stat('totalLifetimeDwellers'),
    babiesBorn: stat('babiesBorn'),
    deadDwellers: stat('deadDwellers'),
    levelsGained: stat('levelsGained'),
    lunchboxesOpened: stat('lunchBoxesOpened'),
    incidentsStopped: incidentKeys.length ? sumOf(incidentKeys) : null,
    firesExtinguished: stat('firesExtinguised'),
    rushes: ok === null && failed === null ? null : { ok: ok ?? 0, failed: failed ?? 0 },
    craftedItems: sumOf(['craftedWeapons', 'craftedOutfits', 'craftedThemes']),
    questsCompleted: Array.isArray(completed) ? completed.length : null,
  };
}

export function summarizeSave(s: SaveJson): VaultOverviewData {
  const vault = (s.vault ?? {}) as Record<string, any>;
  const resources = (vault.storage?.resources ?? {}) as Record<string, unknown>;
  const actors = (s.dwellers as any)?.actors;
  const teams = vault.wasteland?.teams;
  const timeMgr = s.timeMgr as { timeGameBegin?: unknown; timeSaveDate?: unknown } | undefined;

  return {
    mode: getVaultMode(s),
    appVersion: typeof s.appVersion === 'string' ? s.appVersion.trim() || null : null,
    deviceName: typeof s.deviceName === 'string' ? s.deviceName || null : null,
    createdAt: ticksToDate(timeMgr?.timeGameBegin),
    savedAt: ticksToDate(timeMgr?.timeSaveDate),
    dwellers: summarizeDwellers(s),
    resources: [
      ...RESOURCE_LABELS.map(([key, label]) => ({ key, label, value: Math.floor(num(resources[key])) })),
      { key: 'Lunchbox', label: 'Lunchboxes', value: getBoxCount(s, BOX_TYPES.Lunchbox) },
      { key: 'MrHandy', label: 'Mr. Handy boxes', value: getBoxCount(s, BOX_TYPES.MrHandy) },
      { key: 'PetCarrier', label: 'Pet Carriers', value: getBoxCount(s, BOX_TYPES.PetCarrier) },
      { key: 'StarterPack', label: 'Starter Packs', value: getBoxCount(s, BOX_TYPES.StarterPack) },
    ],
    rooms: summarizeRooms(s),
    inventory: summarizeInventory(s),
    mrHandies: Array.isArray(actors) ? actors.filter((a: any) => a?.characterType === 2).length : 0,
    wastelandTeams: Array.isArray(teams) ? teams.length : 0,
    lifetime: summarizeLifetime(s),
  };
}
