# Item Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vault Boy "favorite" toggle to every item picker (hair, face, outfit, weapon, pet) that pins favorited items to the top and persists per-category in localStorage.

**Architecture:** A localStorage-backed `useFavorites(category)` hook plus a pure `pinFavorites` helper. A shared `FavoriteToggle` (Vault Boy image) overlay is rendered top-right of each cell. `OptionGrid` gains optional favorites props (used by hair/face/outfit/weapon); `PetTab` wires the same pieces into its bespoke grid.

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react, Tailwind classes, Vite (`public/` served at root).

---

## File Structure

- `src/lib/useFavorites.ts` (new) — hook, storage IO, `pinFavorites` helper, `FavoriteCategory` type.
- `src/components/editor/FavoriteToggle.tsx` (new) — Vault Boy overlay button.
- `public/vault-boy-fav.png` (new) — waist-up crop asset.
- `src/components/editor/OptionGrid.tsx` (modify) — favorites props, pinning, overlay.
- `src/components/editor/HairTab.tsx` / `FaceTab.tsx` / `OutfitTab.tsx` / `WeaponTab.tsx` (modify) — wire hook.
- `src/components/editor/PetTab.tsx` (modify) — wire hook inline.
- Tests: `tests/useFavorites.test.ts` (new), `tests/OptionGrid.test.tsx` (extend).

---

## Task 1: `useFavorites` hook + `pinFavorites` helper

**Files:**
- Create: `src/lib/useFavorites.ts`
- Test: `tests/useFavorites.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/useFavorites.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites, pinFavorites } from '../src/lib/useFavorites';

describe('useFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('toggles, persists, and isolates categories', () => {
    const { result } = renderHook(() => useFavorites('hair'));
    expect(result.current.favorites).toEqual([]);

    act(() => result.current.toggle('01'));
    expect(result.current.isFavorite('01')).toBe(true);
    expect(JSON.parse(localStorage.getItem('fs-favorites')!).hair).toEqual(['01']);

    // other category unaffected
    const face = renderHook(() => useFavorites('face'));
    expect(face.result.current.favorites).toEqual([]);

    act(() => result.current.toggle('01'));
    expect(result.current.isFavorite('01')).toBe(false);
  });

  it('starts empty on malformed JSON', () => {
    localStorage.setItem('fs-favorites', '{ not json');
    const { result } = renderHook(() => useFavorites('weapon'));
    expect(result.current.favorites).toEqual([]);
  });
});

describe('pinFavorites', () => {
  it('puts favorites first in favorite-order, keeps the rest stable', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const out = pinFavorites(items, (i) => i.id, ['c', 'a']);
    expect(out.map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/useFavorites.test.ts`
Expected: FAIL — cannot import `useFavorites` / `pinFavorites`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/useFavorites.ts
import { useCallback, useState } from 'react';

export type FavoriteCategory = 'hair' | 'face' | 'outfit' | 'weapon' | 'pet';

const STORAGE_KEY = 'fs-favorites';
type Store = Record<FavoriteCategory, string[]>;

const emptyStore = (): Store => ({ hair: [], face: [], outfit: [], weapon: [], pet: [] });

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const p = JSON.parse(raw);
    const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
    return {
      hair: arr(p?.hair), face: arr(p?.face), outfit: arr(p?.outfit),
      weapon: arr(p?.weapon), pet: arr(p?.pet),
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore quota/SSR */ }
}

export function useFavorites(category: FavoriteCategory) {
  const [favorites, setFavorites] = useState<string[]>(() => readStore()[category]);

  const toggle = useCallback((id: string) => {
    const store = readStore();
    const list = store[category];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    writeStore({ ...store, [category]: next });
    setFavorites(next);
  }, [category]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, isFavorite, toggle };
}

/** Stable reorder: favorited items first (in `favorites` order), the rest unchanged. */
export function pinFavorites<T>(items: T[], getId: (item: T) => string, favorites: string[]): T[] {
  const rank = (id: string) => {
    const i = favorites.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank(getId(a.item)) - rank(getId(b.item))) || (a.i - b.i))
    .map((x) => x.item);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/useFavorites.test.ts`
Expected: PASS (4 assertions across 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useFavorites.ts tests/useFavorites.test.ts
git commit -m "feat(favorites): useFavorites hook + pinFavorites helper"
```

---

## Task 2: Vault Boy asset

**Files:**
- Create: `public/vault-boy-fav.png`

The source is the Vault Boy thumbs-up image supplied by the user. It must be saved to
disk first (e.g. `public/vault-boy-source.png`), then cropped to the waist-up region.

- [ ] **Step 1: Save the source image**

Place the supplied image at `public/vault-boy-source.png` (full-body Vault Boy).

- [ ] **Step 2: Crop waist-up**

Crop roughly the top 55% of the image height (head down to the waist), keeping full
width, and write a square-ish PNG to `public/vault-boy-fav.png`. Using ImageMagick:

Run: `magick public/vault-boy-source.png -gravity North -crop 100x55%+0+0 +repage public/vault-boy-fav.png`
Expected: `public/vault-boy-fav.png` exists and shows Vault Boy from the head to the waist (no legs).

Verify visually that the crop shows the thumbs-up torso. Adjust the `55%` if legs remain.

- [ ] **Step 3: Remove the source**

```bash
rm public/vault-boy-source.png
```

- [ ] **Step 4: Commit**

```bash
git add public/vault-boy-fav.png
git commit -m "feat(favorites): add Vault Boy favorite marker asset"
```

---

## Task 3: `FavoriteToggle` component

**Files:**
- Create: `src/components/editor/FavoriteToggle.tsx`

No standalone unit test (purely presentational; its behavior is covered by the
OptionGrid test in Task 4). Build it first so Task 4 can import it.

- [ ] **Step 1: Write the component**

```tsx
// src/components/editor/FavoriteToggle.tsx
import React from 'react';

/**
 * Vault Boy favorite marker, rendered as an overlay inside an item cell.
 *
 * Cells are <button>s, so this MUST NOT be a nested <button> (invalid HTML). It is a
 * role="button" span that stops propagation, so toggling a favorite never selects the
 * item. Desaturated + hover-revealed when inactive; full-color + always-visible when
 * active. Relies on the parent cell carrying the `group` class for hover reveal.
 */
export function FavoriteToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const activate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') activate(e); }}
      className={
        'absolute top-1 right-1 z-10 cursor-pointer transition-opacity ' +
        (active ? 'opacity-100' : 'opacity-0 grayscale group-hover:opacity-70')
      }
    >
      <img src="/vault-boy-fav.png" alt="" width={28} height={28} draggable={false} />
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/FavoriteToggle.tsx
git commit -m "feat(favorites): FavoriteToggle Vault Boy overlay"
```

---

## Task 4: OptionGrid integration

**Files:**
- Modify: `src/components/editor/OptionGrid.tsx`
- Test: `tests/OptionGrid.test.tsx`

- [ ] **Step 1: Write the failing test (append to existing describe block)**

```tsx
// add these imports at top if missing: (vi, fireEvent already imported)
import { FavoriteToggle } from '../src/components/editor/FavoriteToggle'; // not needed, remove if unused

it('pins favorites to the front and toggles via the marker', () => {
  const onToggleFavorite = vi.fn();
  render(
    <OptionGrid
      options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }]}
      selected={null}
      onSelect={() => {}}
      favorites={['c']}
      onToggleFavorite={onToggleFavorite}
    />,
  );
  // 'c' (Gamma) is pinned first
  const labels = screen.getAllByText(/Alpha|Beta|Gamma/).map((n) => n.textContent);
  expect(labels[0]).toBe('Gamma');

  // clicking a marker toggles favorite, not select
  const marker = screen.getAllByRole('button', { name: /favorites/i })[0];
  fireEvent.click(marker);
  expect(onToggleFavorite).toHaveBeenCalledWith('c');
});
```

(Delete the unused `FavoriteToggle` import line — it is only listed to remind you the
component exists; OptionGrid imports it internally.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/OptionGrid.test.tsx`
Expected: FAIL — `favorites`/`onToggleFavorite` props not accepted; no favorites marker rendered.

- [ ] **Step 3: Implement — add props, pinning, `group` class, and the marker**

In `src/components/editor/OptionGrid.tsx`:

1. Add the import at the top:

```tsx
import { pinFavorites } from '../../lib/useFavorites';
import { FavoriteToggle } from './FavoriteToggle';
```

2. Add two props to the function signature (after `showLabel = false, leading`):

```tsx
  favorites,
  onToggleFavorite,
```

and to the props type (after `showLabel?: boolean;`):

```tsx
  /** Ordered favorite ids for this picker's category. When provided with
   *  onToggleFavorite, favorited cells show a Vault Boy marker and pin to the front. */
  favorites?: string[];
  onToggleFavorite?: (value: string) => void;
```

3. Right after the `const colW = ...` line, derive the display order:

```tsx
  const favEnabled = !!favorites && !!onToggleFavorite;
  const displayOptions = favEnabled
    ? pinFavorites(options, (o) => o.value, favorites!)
    : options;
```

4. Add `group ` to the start of `cellClass`:

```tsx
  const cellClass =
    'group rounded border overflow-hidden ' +
    (hasPortrait ? 'flex flex-col items-center ' : 'flex items-center justify-center ');
```

5. Change the map to iterate `displayOptions` instead of `options`:

```tsx
      {displayOptions.map((o) => (
```

6. Inside the `<button>`, immediately after the opening tag's children begin (right
after the `>` of the `<button ...>`), render the marker:

```tsx
          {favEnabled && (
            <FavoriteToggle
              active={favorites!.includes(o.value)}
              onToggle={() => onToggleFavorite!(o.value)}
            />
          )}
```

- [ ] **Step 4: Run tests to verify pass (new + existing)**

Run: `npx vitest run tests/OptionGrid.test.tsx`
Expected: PASS — all OptionGrid tests including the new pinning/toggle test.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/OptionGrid.tsx tests/OptionGrid.test.tsx
git commit -m "feat(favorites): OptionGrid favorites pinning + marker"
```

---

## Task 5: Wire hair / face / outfit / weapon tabs

**Files:**
- Modify: `src/components/editor/HairTab.tsx`
- Modify: `src/components/editor/FaceTab.tsx`
- Modify: `src/components/editor/OutfitTab.tsx`
- Modify: `src/components/editor/WeaponTab.tsx`

Each tab already builds an `options` array and renders `<OptionGrid .../>`. The change
is identical in shape: call the hook and pass two props.

- [ ] **Step 1: HairTab** — add import and hook, pass props.

Import (with the other imports):
```tsx
import { useFavorites } from '../../lib/useFavorites';
```
Inside `HairTab`, near the other hooks (e.g. after `const thumbnails = ...`):
```tsx
  const { favorites, toggle } = useFavorites('hair');
```
On the `<OptionGrid>` element, add:
```tsx
        favorites={favorites}
        onToggleFavorite={toggle}
```

- [ ] **Step 2: FaceTab** — same, with category `'face'`.

```tsx
import { useFavorites } from '../../lib/useFavorites';
```
```tsx
  const { favorites, toggle } = useFavorites('face');
```
Add `favorites={favorites}` and `onToggleFavorite={toggle}` to its `<OptionGrid>`.

- [ ] **Step 3: OutfitTab** — same, with category `'outfit'`.

```tsx
import { useFavorites } from '../../lib/useFavorites';
```
```tsx
  const { favorites, toggle } = useFavorites('outfit');
```
Add `favorites={favorites}` and `onToggleFavorite={toggle}` to its `<OptionGrid>`.

- [ ] **Step 4: WeaponTab** — same, with category `'weapon'`.

```tsx
import { useFavorites } from '../../lib/useFavorites';
```
```tsx
  const { favorites, toggle } = useFavorites('weapon');
```
Add `favorites={favorites}` and `onToggleFavorite={toggle}` to its `<OptionGrid>`.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc -b && npx vitest run`
Expected: no type errors; all existing tab tests (HairTab/FaceTab/OutfitTab/WeaponTab) still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/HairTab.tsx src/components/editor/FaceTab.tsx src/components/editor/OutfitTab.tsx src/components/editor/WeaponTab.tsx
git commit -m "feat(favorites): wire hair/face/outfit/weapon pickers"
```

---

## Task 6: PetTab integration

**Files:**
- Modify: `src/components/editor/PetTab.tsx`

PetTab renders its own grid (not OptionGrid), so wire the pieces inline. The pet cell
`<button>` already has `relative` is NOT set — add `group relative` so the marker
positions and reveals correctly.

- [ ] **Step 1: Add imports and hook**

Imports (with the others):
```tsx
import { useFavorites, pinFavorites } from '../../lib/useFavorites';
import { FavoriteToggle } from './FavoriteToggle';
```

Inside `PetTab`, after the other hooks (e.g. after the `useUnknownItemGuard` line):
```tsx
  const { favorites, toggle } = useFavorites('pet');
```

- [ ] **Step 2: Pin favorites in the visible list**

Find the line that computes `visible` (the `filterByText(...)` result). Immediately
after it, reorder:

```tsx
  const ordered = pinFavorites(visible, (p) => p.id, favorites);
```

Then change the render map from `visible.map(...)` to `ordered.map(...)`.

- [ ] **Step 3: Add `group relative` and the marker to the pet cell**

On the pet `<button>` (the one inside `ordered.map`), prepend `group relative ` to its
className string:

```tsx
              className={[
                'group relative rounded border flex flex-col items-center overflow-hidden transition-colors',
                isEquipped ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
              ].join(' ')}
```

Inside that `<button>`, right after the opening tag, render the marker:

```tsx
              <FavoriteToggle active={favorites.includes(pet.id)} onToggle={() => toggle(pet.id)} />
```

- [ ] **Step 4: Type-check and run the full suite**

Run: `npx tsc -b && npx vitest run`
Expected: no type errors; all tests PASS.

- [ ] **Step 5: Manual verification (dev server)**

Run the dev server, open a dweller, and for each tab (hair, face, outfit, weapon, pet):
hover a cell → desaturated Vault Boy appears top-right; click it → cell jumps to the
front and Vault Boy turns full-color; reload the page → favorite persists; clicking the
marker never changes the equipped item.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/PetTab.tsx
git commit -m "feat(favorites): wire pet picker"
```

---

## Self-Review Notes

- **Spec coverage:** storage shape (Task 1), id-based/gender-independent favorites
  (favoriting by `value`/`pet.id`, Tasks 4–6), Vault Boy asset + two visual states
  (Tasks 2–3), top pinning in favorite-order on the filtered list (pinFavorites applied
  after search in each tab, Tasks 4–6), leading/None/unknown cards stay first
  (pinFavorites runs only over the option/pet list, not the `leading`/None nodes),
  nested-button-safe marker (Task 3). All covered.
- **Out of scope (not implemented):** cross-tab sync, export/import with save,
  favoriting None/unknown cards.
