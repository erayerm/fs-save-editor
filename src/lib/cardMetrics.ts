export interface CardMetrics {
  avatar: number;
  /** Tight card width (just the avatar + its own padding). */
  inner: number;
  /** Empty space between neighboring cards, applied as margin so the hover area stays tight. */
  gap: number;
  /** Slot width consumed per card in the horizontal strip. */
  slot: number;
  /** Height of the scrolling strip that holds the cards. */
  strip: number;
  icon: number;
  font: number;
}

/**
 * Card sizing tiers by viewport height, so the footer strip doesn't crowd the
 * editor on short windows. The largest tier matches the outfit-picker cell (170).
 */
export function cardMetrics(viewportH: number): CardMetrics {
  const [avatar, gap, icon, font] =
    viewportH >= 900 ? [170, 20, 18, 13]
    : viewportH >= 760 ? [140, 16, 15, 12]
    : [112, 12, 12, 10];
  const inner = avatar + 8;
  return { avatar, inner, gap, slot: inner + gap, strip: avatar + icon + font + 55, icon, font };
}
