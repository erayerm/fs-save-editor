/** One legendary dweller roster entry (generated into public/atlas/legendaries.json). */
export interface LegendaryMeta {
  /** Save identity, e.g. "L_Jericho" — written to the dweller's `uniqueData`. */
  uniqueData: string;
  name: string;
  lastName: string;
  /** Save encoding: 1 = female, 2 = male. */
  gender: number;
  /** [S, P, E, C, I, A, L]. */
  special: number[];
  outfitId: string;
  /** May be empty — the game assigns a default weapon. */
  weaponId: string;
  /** ARGB uint32. */
  skinColor: number;
  /** ARGB uint32. */
  hairColor: number;
  /** Hair piece name, or null when the character uses none. */
  hair: string | null;
  /** Facemask piece name (beard/wrinkles/etc.), or null. */
  faceMask: string | null;
}

export interface LegendaryIndex {
  version: number;
  legendaries: LegendaryMeta[];
}
