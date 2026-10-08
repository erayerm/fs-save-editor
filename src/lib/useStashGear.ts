import { useMemo } from 'react';
import { create } from 'zustand';
import { useSaveStore } from '../store/saveStore';
import { getStashItems, groupStash, type StashGroup } from './stash';

export type GearSource = 'global' | 'stash';
type GearTab = 'outfit' | 'weapon' | 'pet';

// Module-level so each picker remembers its source across tab switches.
const useGearSources = create<Record<GearTab, GearSource>>(() => ({ outfit: 'global', weapon: 'global', pet: 'global' }));

/** Whether a gear picker lists every item in the game or only the vault stash. */
export function useGearSource(tab: GearTab): [GearSource, (s: GearSource) => void] {
  const source = useGearSources((s) => s[tab]);
  return [source, (s) => useGearSources.setState({ [tab]: s })];
}

/**
 * Stashed weapons, outfits or pets, grouped so identical items appear once with
 * a count, plus how many stashed copies there are of each item id.
 */
export function useStashGear(type: 'Weapon' | 'Outfit' | 'Pet'): {
  groups: StashGroup[];
  count: number;
  countById: Map<string, number>;
} {
  const items = useSaveStore((s) => (s.save ? getStashItems(s.save) : null));
  return useMemo(() => {
    const groups = groupStash(items ?? []).filter((g) => g.item.type === type);
    const countById = new Map<string, number>();
    for (const g of groups) countById.set(g.item.id, (countById.get(g.item.id) ?? 0) + g.indices.length);
    return { groups, count: groups.reduce((n, g) => n + g.indices.length, 0), countById };
  }, [items, type]);
}
