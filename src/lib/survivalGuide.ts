import type { SaveJson } from '../types/save';

/**
 * The Survival Guide's legendary-dweller collection (the in-game "x/58" counter)
 * is stored in the save at `survivalW.dwellers` as an array of strings, each a
 * single status-prefix character followed by the dweller's `uniqueData`:
 *   - "N" = newly discovered (unviewed — shows the NEW! badge)
 *   - "O" = already viewed
 * e.g. "NL_Jericho", "OL_AlistairTenpenny".
 *
 * The game registers a legendary here only when it is *created* (from a lunchbox
 * or quest), never on load. So a legendary injected straight into the dweller
 * roster renders correctly in the vault but does NOT count toward the collection
 * unless we add it here explicitly. This list is legendary-only (rare/normal
 * unique dwellers are not tracked here), matching the "x/58" guide tab.
 */
export function registerLegendaryDiscovery(guideDwellers: string[], uniqueData: string): string[] {
  // Existing entries carry a 1-char status prefix ("N"/"O"); compare on the
  // unprefixed id so an already-collected legendary isn't duplicated.
  if (guideDwellers.some((e) => e.slice(1) === uniqueData)) return guideDwellers;
  return [...guideDwellers, `N${uniqueData}`];
}

/**
 * Return a copy of `save` whose Survival Guide collection includes an entry for
 * every legendary currently in the roster. This is applied at EXPORT time (not
 * when adding a dweller) so that a legendary added and then evicted before export
 * leaves no phantom collection entry. It only adds missing entries and never
 * removes any, so legitimately-collected legendaries (e.g. ones discovered in the
 * real game whose dweller has since died/been evicted) are preserved.
 */
export function reconcileLegendaryGuide(save: SaveJson): SaveJson {
  const roster = save.dwellers?.dwellers ?? [];
  const survivalW = (save.survivalW ?? {}) as Record<string, unknown>;
  let guide = Array.isArray(survivalW.dwellers) ? (survivalW.dwellers as string[]) : [];
  let changed = false;
  for (const d of roster) {
    if (d.rarity === 'Legendary' && typeof d.uniqueData === 'string') {
      const next = registerLegendaryDiscovery(guide, d.uniqueData);
      if (next !== guide) { guide = next; changed = true; }
    }
  }
  if (!changed) return save;
  return { ...save, survivalW: { ...survivalW, dwellers: guide } };
}
