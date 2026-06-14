export const SPECIAL_ORDER = ['S', 'P', 'E', 'C', 'I', 'A', 'L'] as const;
export type Special = typeof SPECIAL_ORDER[number];

export interface DwellerStat { value: number; mod: number; exp: number; }

export interface EquipRef {
  id: string;
  type: string;
  hasBeenAssigned?: boolean;
  hasRandonWeaponBeenAssigned?: boolean;
  [k: string]: unknown;
}

export interface SaveJson {
  dwellers: {
    dwellers: Dweller[];
    [k: string]: unknown;
  };
  vault?: { [k: string]: unknown };
  [k: string]: unknown;
}

export interface Dweller {
  serializeId: number;
  name: string;
  lastName: string;
  gender: number;
  experience?: { currentLevel?: number; [k: string]: unknown };
  stats?: { stats: DwellerStat[]; [k: string]: unknown };
  equipedWeapon?: EquipRef;
  equipedOutfit?: EquipRef;
  hair?: string;
  rarity?: string;
  uniqueData?: string;
  [k: string]: unknown;
}
