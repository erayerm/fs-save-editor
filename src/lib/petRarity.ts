/** Pet rarity tiers, in ascending order. */
export const RARITIES = ['Normal', 'Rare', 'Legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

/** Solid swatch (dot) color per rarity for menus, legends, and card labels. */
export const RARITY_DOT: Record<string, string> = {
  Normal: 'rgb(82, 82, 91)', // zinc-600
  Rare: '#20445e',
  Legendary: '#b28a28',
};
