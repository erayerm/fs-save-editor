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
