import type { IconRect } from './icons';

export interface WeaponMeta { name: string; damageMin: number; damageMax: number; icon: IconRect | null; }
export interface WeaponIndex { version: 1; weapons: Record<string, WeaponMeta>; }
