export interface WeaponMeta { name: string; damageMin: number; damageMax: number; icon: string; }
export interface WeaponIndex { version: 1; weapons: Record<string, WeaponMeta>; }
