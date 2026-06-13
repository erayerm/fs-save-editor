# Filter Bar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the weapon/outfit/pet pickers' filter bar better: allow "no sort" (Default), add a SPECIAL icon popover (outfit), add text search to all three tabs, add a Reset button, and make the bar sticky at the top while the grid scrolls.

**Architecture:** Extend the pure `pickerSort` helpers (a `'default'` sort state + a `filterByText` helper), rebuild the presentational `SortFilterBar` (sticky, search input, Reset, SPECIAL popover, per-mode controls), and wire all three tabs. No save-format or pipeline changes.

**Tech Stack:** TypeScript, React, Tailwind, Vitest.

**Branch:** `20260613-pets-gender-filters` (continue; do NOT switch).

---

## Decisions (approved)
- **Default/no-sort:** sort dropdown gains a `Default` option (original order, pinned defaults preserved). Initial state is `Default`, so the picker opens unsorted.
- **Reset button:** clears search + sort + SPECIAL back to defaults.
- **SPECIAL filter:** a `SPECIAL` button opens a small popover of the 7 `SpecialIcon`s; click one to filter by it, click again or "Clear" to remove; click-away closes. Outfit only.
- **Text search:** all three tabs. Weapon → name; Outfit → name; Pet → name + bonus + rarity. Case-insensitive substring.
- **Sticky:** the bar sticks to the top of the editor's scroll container (`overflow-y-auto` in `DwellerEditor`) so it stays visible while the grid scrolls.

---

## File structure
- Modify `src/lib/pickerSort.ts` — `SortDir` adds `'default'`; `sortByDamage`/`filterAndSortOutfits` honor it; new `filterByText`.
- Modify `src/lib/pickerSort.test.ts` — tests for `'default'` + `filterByText`.
- Rewrite `src/components/editor/SortFilterBar.tsx` — sticky bar, search, Reset, SPECIAL popover, modes `weapon|outfit|pet`.
- Modify `src/components/editor/WeaponTab.tsx` — search + Default + reset + sticky wrapper.
- Modify `src/components/editor/OutfitTab.tsx` — search + Default + reset.
- Modify `src/components/editor/PetTab.tsx` — search + reset (mode `pet`).

---

## Task 13: Extend pickerSort (default sort + text search)

**Files:** Modify `src/lib/pickerSort.ts`, `src/lib/pickerSort.test.ts`

- [ ] **Step 1: Update the tests** — append/extend `src/lib/pickerSort.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sortByDamage, filterAndSortOutfits, filterByText, type SpecialKey } from './pickerSort';

describe('sortByDamage', () => {
  const w = (id: string, damageMin: number, damageMax: number) => ({ id, damageMin, damageMax });
  it('sorts ascending by average damage', () => {
    expect(sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'asc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('sorts descending by average damage', () => {
    expect(sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'desc').map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
  it('returns original order (copy) when dir is default', () => {
    const input = [w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)];
    const out = sortByDamage(input, 'default');
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(input);
  });
});

describe('filterAndSortOutfits', () => {
  const o = (id: string, special: Partial<Record<SpecialKey, number>>) => ({ id, special });
  const items = [o('x', { S: 3 }), o('y', { S: 1, E: 2 }), o('z', { E: 5 })];
  it('filters + sorts desc by the stat', () => {
    expect(filterAndSortOutfits(items, 'S', 'desc').map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('filters + sorts asc by the stat', () => {
    expect(filterAndSortOutfits(items, 'S', 'asc').map((i) => i.id)).toEqual(['y', 'x']);
  });
  it('filters but keeps original order when dir is default', () => {
    expect(filterAndSortOutfits(items, 'S', 'default').map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('returns all items unchanged when stat is null', () => {
    expect(filterAndSortOutfits(items, null, 'desc').map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });
});

describe('filterByText', () => {
  const items = [{ id: 'a', t: 'German Shepherd' }, { id: 'b', t: 'Persian Cat' }, { id: 'c', t: 'Husky' }];
  const get = (i: { t: string }) => i.t;
  it('returns all items when query is empty/whitespace', () => {
    expect(filterByText(items, '   ', get)).toBe(items);
  });
  it('matches case-insensitive substring', () => {
    expect(filterByText(items, 'sh', get).map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('returns empty when nothing matches', () => {
    expect(filterByText(items, 'zzz', get)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL** — `npx vitest run src/lib/pickerSort.test.ts` (filterByText missing, default unsupported).

- [ ] **Step 3: Update `src/lib/pickerSort.ts`:**

```ts
export type SortDir = 'default' | 'asc' | 'desc';
export type SpecialKey = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

interface HasDamage { damageMin: number; damageMax: number; }
interface HasSpecial { special?: Partial<Record<SpecialKey, number>>; }

const avg = (w: HasDamage) => (w.damageMin + w.damageMax) / 2;

/** Sort a copy of weapons by average damage. `default` keeps the original order. */
export function sortByDamage<T extends HasDamage>(items: T[], dir: SortDir): T[] {
  if (dir === 'default') return [...items];
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * (avg(a) - avg(b)));
}

/**
 * When `stat` is set, keep only outfits granting that SPECIAL stat; sort by its
 * value unless `dir` is `default` (then keep original order). When `stat` is null,
 * return the items unchanged.
 */
export function filterAndSortOutfits<T extends HasSpecial>(items: T[], stat: SpecialKey | null, dir: SortDir): T[] {
  if (!stat) return items;
  const filtered = items.filter((o) => (o.special?.[stat] ?? 0) > 0);
  if (dir === 'default') return filtered;
  const sign = dir === 'asc' ? 1 : -1;
  return filtered.sort((a, b) => sign * ((a.special?.[stat] ?? 0) - (b.special?.[stat] ?? 0)));
}

/**
 * Case-insensitive substring filter. Empty/whitespace query returns the input
 * array unchanged (same reference) so callers can skip work.
 */
export function filterByText<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => getText(it).toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run tests, expect PASS** — `npx vitest run src/lib/pickerSort.test.ts` (all pass). Then `npx tsc -b` (note: tabs still pass `'desc'` default — they compile fine; they get updated in later tasks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pickerSort.ts src/lib/pickerSort.test.ts
git commit -m "feat(picker): default (no-sort) state + text-search helper"
```

---

## Task 14: Rebuild SortFilterBar (sticky, search, reset, SPECIAL popover)

**Files:** Rewrite `src/components/editor/SortFilterBar.tsx`

Context: `SpecialIcon` is at `src/components/SpecialIcon.tsx` (`<SpecialIcon letter={s} size={20} />`). The bar must be sticky at the top of the editor's scroll container. The 7-icon SPECIAL filter is a popover that closes on outside click.

- [ ] **Step 1: Replace the file contents entirely:**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { SortDir, SpecialKey } from '../../lib/pickerSort';
import { SpecialIcon } from '../SpecialIcon';

const SPECIALS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

/** SPECIAL stat filter: a button that opens a popover of the 7 stat icons. */
function SpecialFilter({ stat, onChange }: { stat: SpecialKey | null; onChange: (s: SpecialKey | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
      >
        <span>SPECIAL</span>
        {stat ? <SpecialIcon letter={stat} size={16} /> : <span className="text-zinc-400 text-xs">All</span>}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-20 p-2 rounded border border-zinc-600 bg-zinc-800 shadow-lg flex flex-col gap-2"
          style={{ minWidth: 200 }}
        >
          <div className="grid grid-cols-7 gap-1">
            {SPECIALS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={stat === s}
                title={s}
                onClick={() => { onChange(stat === s ? null : s); setOpen(false); }}
                className={[
                  'flex items-center justify-center rounded p-1 transition-colors',
                  stat === s ? 'bg-green-950/60 ring-1 ring-green-400' : 'hover:bg-zinc-700',
                ].join(' ')}
              >
                <SpecialIcon letter={s} size={20} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="text-xs text-zinc-300 hover:text-white text-left px-1 disabled:opacity-40"
            disabled={!stat}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Sticky control bar above a picker grid. Search applies to every mode; the
 * weapon/outfit modes add a sort selector (with a Default/no-sort option), and
 * the outfit mode adds a SPECIAL filter popover. A Reset clears everything.
 */
export function SortFilterBar({
  mode, query, onQueryChange, onReset, dir, onDirChange, stat, onStatChange,
}: {
  mode: 'weapon' | 'outfit' | 'pet';
  query: string;
  onQueryChange: (q: string) => void;
  onReset: () => void;
  /** weapon + outfit modes */
  dir?: SortDir;
  onDirChange?: (d: SortDir) => void;
  /** outfit mode only */
  stat?: SpecialKey | null;
  onStatChange?: (s: SpecialKey | null) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-1 py-2 mb-1 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 text-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className="flex-1 min-w-0 bg-zinc-700 text-zinc-100 placeholder-zinc-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
      {mode === 'outfit' && onStatChange && (
        <SpecialFilter stat={stat ?? null} onChange={onStatChange} />
      )}
      {(mode === 'weapon' || mode === 'outfit') && onDirChange && (
        <label className="flex items-center gap-1 text-zinc-400 shrink-0">
          <span>Sort</span>
          <select
            value={dir}
            onChange={(e) => onDirChange(e.target.value as SortDir)}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
          >
            <option value="default">Default</option>
            <option value="desc">{mode === 'weapon' ? 'Damage: high to low' : 'High to low'}</option>
            <option value="asc">{mode === 'weapon' ? 'Damage: low to high' : 'Low to high'}</option>
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={onReset}
        className="shrink-0 px-2 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Reset
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc -b`. NOTE: this will report errors in the three tab files because their `<SortFilterBar .../>` calls don't yet pass the new required props (`query`, `onQueryChange`, `onReset`). That's expected; those are fixed in Task 15. If you want a clean intermediate compile you may do Task 15 immediately after. Do NOT "fix" the tabs in this task beyond what Task 15 specifies.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/SortFilterBar.tsx
git commit -m "feat(picker): sticky filter bar with search, reset & SPECIAL popover"
```

---

## Task 15: Wire search/Default/sticky into the three tabs

**Files:** Modify `src/components/editor/WeaponTab.tsx`, `OutfitTab.tsx`, `PetTab.tsx`

Read all three files first. Preserve every card/option rendering body exactly; only change state, the list derivation, and the bar/wrapper.

### Part A — WeaponTab

- [ ] **Step 1:** Update imports: `import { sortByDamage, filterByText, type SortDir } from '../../lib/pickerSort';`
- [ ] **Step 2:** Replace the state line `const [dir, setDir] = useState<SortDir>('desc');` with:
```ts
  const [dir, setDir] = useState<SortDir>('default');
  const [query, setQuery] = useState('');
```
- [ ] **Step 3:** Replace the list derivation (the `all`/`def`/`rest`/`entries` block) with one that searches by name first:
```ts
  const DEFAULT_WEAPON = 'Fist';
  const all = Object.entries(weaponIndex.weapons).map(([id, meta]) => ({ id, ...meta }));
  const searched = filterByText(all, query, (w) => w.name);
  const def = searched.filter((w) => w.id === DEFAULT_WEAPON);
  const rest = sortByDamage(searched.filter((w) => w.id !== DEFAULT_WEAPON), dir);
  const entries: [string, typeof all[number]][] = [...def, ...rest].map((w) => [w.id, w]);
```
- [ ] **Step 4:** Change the outer wrapper from `<div className="pt-4">` to `<div>` (remove `pt-4` — the sticky bar provides its own top spacing). Update the bar usage to:
```tsx
      <SortFilterBar
        mode="weapon"
        query={query}
        onQueryChange={setQuery}
        onReset={() => { setQuery(''); setDir('default'); }}
        dir={dir}
        onDirChange={setDir}
      />
```
Keep the grid `<div>` and the card `.map(...)` body exactly as-is.

### Part B — OutfitTab

- [ ] **Step 5:** Update imports: `import { filterAndSortOutfits, filterByText, type SortDir, type SpecialKey } from '../../lib/pickerSort';`
- [ ] **Step 6:** Change `const [dir, setDir] = useState<SortDir>('desc');` to `const [dir, setDir] = useState<SortDir>('default');` and add `const [query, setQuery] = useState('');` next to it.
- [ ] **Step 7:** Replace the `base`/`ordered` lines with a search-first derivation:
```ts
  const base = visibleOutfits(index, gender);
  const searched = filterByText(base, query, (o) => o.name);
  const ordered = stat ? filterAndSortOutfits(searched, stat, dir) : searched;
```
(Keep the `options = ordered.map(...)` body exactly as-is.)
- [ ] **Step 8:** Change the wrapper `<div className="pt-4">` to `<div>` and update the bar usage:
```tsx
      <SortFilterBar
        mode="outfit"
        query={query}
        onQueryChange={setQuery}
        onReset={() => { setQuery(''); setDir('default'); setStat(null); }}
        dir={dir}
        onDirChange={setDir}
        stat={stat}
        onStatChange={setStat}
      />
```
Keep the `<OptionGrid .../>` props exactly as-is.

### Part C — PetTab

- [ ] **Step 9:** Add imports: `import { SortFilterBar } from './SortFilterBar';` and `import { filterByText } from '../../lib/pickerSort';` and ensure `useState` is imported (PetTab already imports it).
- [ ] **Step 10:** Add `const [query, setQuery] = useState('');` after the existing `equippedId` selector.
- [ ] **Step 11:** After the `pets` sort, filter by name + bonus + rarity:
```ts
  const visible = filterByText(pets, query, (p) => `${p.name} ${p.bonus} ${p.rarity}`);
```
- [ ] **Step 12:** Restructure the return so the sticky bar sits above the grid. Currently PetTab returns a single `<div className="grid ... p-1 pt-4 ...">`. Wrap it:
```tsx
  return (
    <div>
      <SortFilterBar mode="pet" query={query} onQueryChange={setQuery} onReset={() => setQuery('')} />
      <div className="grid gap-1.5 p-1 justify-between" style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}>
        {/* None card — unchanged */}
        {/* then: */}
        {visible.map((pet) => { /* EXISTING pet card body — unchanged */ })}
      </div>
    </div>
  );
```
Change the pets `.map` source from `pets` to `visible` for the pet cards. Keep the "None" card first and unchanged. Remove the old `pt-4` from the grid div (the bar owns top spacing).

### Verify
- [ ] **Step 13:** `npx tsc -b` — no errors.
- [ ] **Step 14:** `npm test` — all pass.
- [ ] **Step 15:** `npm run build` — succeeds.
- [ ] **Step 16:** Manual (`npm run dev`): on each of Weapon/Outfit/Pet tabs — the bar stays pinned at the top while the grid scrolls; search narrows the grid live; Reset restores; Outfit SPECIAL popover opens, filters, and closes on outside click; Sort `Default` returns the original order.
- [ ] **Step 17: Commit**
```bash
git add src/components/editor/WeaponTab.tsx src/components/editor/OutfitTab.tsx src/components/editor/PetTab.tsx
git commit -m "feat(picker): search, default sort & sticky bar in weapon/outfit/pet tabs"
```

---

## Self-review notes
- Empty-result states: `OptionGrid` already renders "No options available." for outfits. Weapon/Pet grids simply show no cards under the bar when a search matches nothing — acceptable (the bar + its Reset remain visible because it's sticky).
- Sticky correctness: the bar is sticky within `DwellerEditor`'s `overflow-y-auto` content container; no intermediate ancestor sets overflow, so `top-0` pins to the viewport top of that scroll area.
