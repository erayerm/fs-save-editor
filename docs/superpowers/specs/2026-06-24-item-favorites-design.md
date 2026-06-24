# Item Favorites — Design

**Date:** 2026-06-24
**Branch:** `feat/item-favorites`

## Summary

Add a per-cell "favorite" toggle to the item pickers (hair, face, outfit, weapon,
pet). Favorited items are pinned to the top of their picker. Favorites persist in
localStorage, scoped per category. The toggle is rendered as a Vault Boy (Fallout's
mascot, thumbs-up) image instead of a generic heart.

## Behavior

- A favorite marker sits in the **top-right corner** of each item cell.
  - **Not favorited:** desaturated (greyscale, reduced opacity) Vault Boy, visible
    only on cell hover.
  - **Favorited:** full-color Vault Boy, always visible (no hover required).
- Clicking the marker toggles favorite state without selecting/equipping the item.
- **Pinning (behavior "A"):** favorited items are pinned to the top of the picker, in
  the order they were favorited. The remaining items keep their current sort/filter
  order. Pinning is applied to the **already filtered** list, so if a search query
  excludes a favorited item, it is hidden too (favorites are not exempt from search).
- Pinned items come **after** any leading/pinned cards (unknown-item card, pet "None"
  card), which remain first.
- Favorites are **id-based and gender-independent**: an item is favorited by its id
  within its own category, regardless of dweller gender.

## Storage

- localStorage key: `fs-favorites`.
- Shape: `{ hair: string[], face: string[], outfit: string[], weapon: string[], pet: string[] }`.
- Each array preserves **favorite-add order** (drives top pinning order).
- Reads are crash-safe: malformed/missing JSON falls back to empty per-category arrays.
- No cross-tab `storage` event sync (YAGNI for this editor).

## Components & Data Flow

### `src/lib/useFavorites.ts` (new)

Hook `useFavorites(category)` where `category` is one of
`'hair' | 'face' | 'outfit' | 'weapon' | 'pet'`.

Returns:
- `favorites: string[]` — ordered favorite ids for the category.
- `isFavorite(id: string): boolean`
- `toggle(id: string): void` — adds (append) or removes; writes localStorage and
  updates state.

Internals: read+parse `fs-favorites` defensively, mutate the one category, write back.

### `src/components/editor/FavoriteToggle.tsx` (new)

Shared marker used by both `OptionGrid` and `PetTab`.

- Renders the Vault Boy `<img src="/vault-boy-fav.png">` wrapped in a clickable
  element that is **not** a `<button>` (cells are already `<button>`; nested buttons
  are invalid HTML). Use a `<span role="button" tabIndex={0}>` with
  `aria-label` ("Add to favorites" / "Remove from favorites").
- `onClick`/`onKeyDown` (Enter/Space) call `onToggle` and `stopPropagation` +
  `preventDefault` so the cell's select handler does not fire.
- Props: `{ active: boolean; onToggle: () => void }`.
- Styling: absolutely positioned top-right; desaturated + hover-reveal when
  `!active`, full-color + always-visible when `active`. Hover reveal keyed off the
  cell's hover (group-hover or equivalent).

### `public/vault-boy-fav.png` (new)

Waist-up crop of the supplied Vault Boy thumbs-up image.

### `OptionGrid.tsx` (changed)

New optional props:
- `favorites?: string[]` (ordered favorite ids)
- `onToggleFavorite?: (value: string) => void`

When both are provided:
1. Render a `FavoriteToggle` overlay in each cell (`active` = value in favorites).
2. **Pin:** stable-reorder `options` so favorited entries come first, in `favorites`
   array order; non-favorites keep their incoming order. `leading` stays first.

When the props are absent, `OptionGrid` behaves exactly as today.

### Tab wiring

`HairTab`, `FaceTab`, `OutfitTab`, `WeaponTab`: call `useFavorites('<category>')` and
pass `favorites` + `toggle` into `OptionGrid`. No other change — the existing
search/sort already filters the list before it reaches `OptionGrid`, so behavior "A"
falls out naturally.

`PetTab` (bespoke grid, does not use `OptionGrid`):
- Call `useFavorites('pet')`.
- Add `FavoriteToggle` to each pet `<button>` cell (same stopPropagation contract).
- Stable-reorder the post-filter `visible` pet list so favorites lead; the `None`
  card and unknown-item card stay first.

## Testing

- `useFavorites`: toggle adds/removes; persists to localStorage; malformed JSON →
  empty start; categories are isolated (favoriting in `hair` does not affect `face`).
- Pinning logic: favorites lead in add-order; non-favorites keep order; a search that
  excludes a favorite hides it (behavior "A").
- Existing tab tests (HairTab/OutfitTab/WeaponTab/FaceTab) must still pass.

## Out of Scope

- Cross-tab live sync of favorites.
- Exporting/importing favorites with the save file (favorites are editor-local).
- Favoriting the "None" / unknown-item cards.
