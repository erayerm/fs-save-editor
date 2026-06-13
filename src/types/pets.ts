import type { IconRect } from './icons';

export interface PetMeta {
  id: string;          // save id, e.g. "germanshepherd_l"
  name: string;        // display name (breed)
  type: string;        // Dog | Cat | Macaw | FloatingDrone | Rollerbrain
  breed: string;
  rarity: string;      // Normal | Rare | Legendary
  bonus: string;       // EBonusEffect name, written to extraData.bonus
  bonusValue: number;  // written to extraData.bonusValue (range max)
  bonusLabel: string;  // human label, e.g. "ObjectiveMultiplier +3"
  uniqueName: string;  // default extraData.uniqueName
  icon: IconRect | null;
}
export interface PetIndex { version: 1; pets: Record<string, PetMeta>; }
