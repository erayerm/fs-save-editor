# Child Dweller Editor Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give child dwellers a focused editor: no avatar (a skeleton with a "Child" marker), only the SPECIAL and Others tabs, editable SPECIAL, and an Others tab limited to Name and the Danger Zone.

**Architecture:** Add a small `ChildAvatar` placeholder component. In `DwellerEditor`, drop the early "child is locked" return and instead derive the tab list and the avatar from `isChild`, with a fallback for the active tab. Make `StatsTab` always editable and have `OthersTab` hide its adult-only sections for children.

**Tech Stack:** TypeScript, React, Tailwind, Vitest + @testing-library/react.

**Branch:** `20260613-child-dweller-editor` (already created; do NOT work on `master`).

---

## Background facts (verified on this branch)

- `isChildDweller` returns true when `experience.currentLevel === 0`; the result is
  attached as `dweller.isChild` by `DwellerDetailPanel` / `CharacterCard`.
- `DwellerEditor.tsx` currently has an early `if (dweller.isChild) return (...)` that
  renders `DwellerCanvas` + a "Child dwellers cannot be customized." message and no tabs.
- `StatsTab.tsx` disables the SPECIAL inputs for children (`disabled = !!dweller.isChild`).
- `OthersTab.tsx` takes props `{ dweller, onChange, index }` and disables Name/Gender/Level
  for children via `disabled = !!dweller.isChild`. Its sections are: Name, Gender, Level,
  Pregnancy (female only), Skin color, Danger Zone. `setGender(d, v, index ?? undefined)`
  takes a third `index` argument.
- Tests render the tab components directly (not `DwellerEditor`) and do not type-check
  against the component prop types (vitest/esbuild), so a test may omit/relax props.

## File structure

- Create `src/components/editor/ChildAvatar.tsx` — portrait placeholder for children.
- Create `tests/ChildAvatar.test.tsx`.
- Modify `src/components/editor/StatsTab.tsx` — SPECIAL editable for everyone.
- Modify `tests/StatsTab.test.tsx` — add a child-editable test.
- Modify `src/components/editor/OthersTab.tsx` — children get only Name + Danger Zone.
- Modify `tests/OthersTab.test.tsx` — add a child-sections test.
- Modify `src/components/DwellerEditor.tsx` — conditional tabs + avatar + active-tab fallback.

---

## Task 1: ChildAvatar placeholder

**Files:**
- Create: `src/components/editor/ChildAvatar.tsx`
- Test: `tests/ChildAvatar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/ChildAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { ChildAvatar } from '../src/components/editor/ChildAvatar';

it('shows a Child marker and a skeleton placeholder', () => {
  const { container } = render(<ChildAvatar />);
  expect(screen.getByText('Child')).toBeTruthy();
  expect(container.querySelector('.animate-pulse')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ChildAvatar.test.tsx`
Expected: FAIL (cannot find module `../src/components/editor/ChildAvatar`).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/editor/ChildAvatar.tsx
/**
 * Portrait-slot placeholder for child dwellers. Children have no customizable
 * model, so instead of rendering art we show a loading-style skeleton with a
 * small "Child" marker in the top-left corner.
 */
export function ChildAvatar() {
  return (
    <div className="relative w-full h-full rounded border border-zinc-700 bg-zinc-950 overflow-hidden">
      <span className="absolute top-2 left-2 z-10 rounded px-2 py-0.5 text-[11px] font-semibold bg-sky-400 text-zinc-900">
        Child
      </span>
      <div className="w-full h-full p-4">
        <div className="w-full h-full rounded-md bg-zinc-700/40 animate-pulse" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ChildAvatar.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/ChildAvatar.tsx tests/ChildAvatar.test.tsx
git commit -m "feat(editor): ChildAvatar placeholder (skeleton + Child marker)"
```

---

## Task 2: SPECIAL editable for children

**Files:**
- Modify: `src/components/editor/StatsTab.tsx`
- Modify: `tests/StatsTab.test.tsx`

- [ ] **Step 1: Add the failing test**

Append to `tests/StatsTab.test.tsx`:

```tsx
const childDweller: any = { serializeId: 1, gender: 1, isChild: true };

it('allows editing SPECIAL for child dwellers', () => {
  render(<StatsTab dweller={childDweller} />);
  const s = screen.getByLabelText('S') as HTMLInputElement;
  expect(s.disabled).toBe(false);
  fireEvent.change(s, { target: { value: '7' } });
  expect(useSaveStore.getState().getSelectedDweller()!.stats!.stats[1].value).toBe(7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/StatsTab.test.tsx`
Expected: FAIL (`s.disabled` is `true` for a child with the current code).

- [ ] **Step 3: Replace `src/components/editor/StatsTab.tsx` with:**

```tsx
import { useSaveStore } from '../../store/saveStore';
import { setStat } from '../../lib/dwellerEdit';
import { SPECIAL_ORDER } from '../../types/save';
import { SpecialIcon } from '../SpecialIcon';
import type { RenderableDweller } from '../../lib/dwellerRender';

export function StatsTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const sel = useSaveStore((s) => s.getSelectedDweller());
  const updateRaw = useSaveStore((s) => s.updateSelectedDwellerRaw);

  return (
    <div className="space-y-6 pt-4">
      {/* SPECIAL stats */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">SPECIAL</h3>
        <div className="space-y-2">
          {SPECIAL_ORDER.map((letter, i) => {
            const value = sel?.stats?.stats?.[i + 1]?.value ?? 1;
            const inputId = `special-${letter}`;
            return (
              <div key={letter} className="flex items-center gap-3">
                <label htmlFor={inputId} className="flex items-center justify-center w-7" title={letter}>
                  <SpecialIcon letter={letter} size={24} title={letter} />
                </label>
                <input
                  id={inputId}
                  type="number"
                  aria-label={letter}
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) => updateRaw((d) => setStat(d, letter, Number(e.target.value)))}
                  className="w-16 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center"
                />
                <input
                  type="range"
                  aria-hidden="true"
                  tabIndex={-1}
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) => updateRaw((d) => setStat(d, letter, Number(e.target.value)))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-6 text-right text-zinc-400 text-sm">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

(The `dweller` prop is renamed to `_dweller` because it is no longer read; this matches
the existing convention in `WeaponTab`/`PetTab`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/StatsTab.test.tsx`
Expected: PASS (all 3 tests, including the new child test).

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/StatsTab.tsx tests/StatsTab.test.tsx
git commit -m "feat(editor): make SPECIAL editable for child dwellers"
```

---

## Task 3: Others tab limited to Name + Danger Zone for children

**Files:**
- Modify: `src/components/editor/OthersTab.tsx`
- Modify: `tests/OthersTab.test.tsx`

- [ ] **Step 1: Add the failing test**

Append to `tests/OthersTab.test.tsx`:

```tsx
const childDweller: any = { serializeId: 1, gender: 1, isChild: true };

it('shows only Name and Danger Zone for child dwellers', () => {
  render(<OthersTab dweller={childDweller} onChange={() => {}} index={null} />);
  // Name is present and editable
  const fn = screen.getByLabelText(/first name/i) as HTMLInputElement;
  expect(fn.disabled).toBe(false);
  // Danger Zone is present
  expect(screen.getByRole('button', { name: /evict dweller/i })).toBeTruthy();
  // Adult-only sections are hidden
  expect(screen.queryByText('Gender')).toBeNull();
  expect(screen.queryByText('Level')).toBeNull();
  expect(screen.queryByText(/skin color/i)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/OthersTab.test.tsx`
Expected: FAIL (Gender/Level/Skin color are currently rendered for children, and the
first-name input is disabled).

- [ ] **Step 3: Replace `src/components/editor/OthersTab.tsx` with:**

```tsx
import { useState } from 'react';
import { useSaveStore } from '../../store/saveStore';
import { setName, setPregnancy, setLevel, setGender, MIN_LEVEL, MAX_LEVEL } from '../../lib/dwellerEdit';
import { ColorPalette } from './ColorPalette';
import { ConfirmModal } from '../ConfirmModal';
import { SKIN_PRESETS } from '../../lib/colorPresets';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { SpriteIndex } from '../../types/pieces';

export function OthersTab({
  dweller,
  onChange,
  index,
}: {
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
  index: SpriteIndex | null;
}) {
  const sel = useSaveStore((s) => s.getSelectedDweller());
  const updateRaw = useSaveStore((s) => s.updateSelectedDwellerRaw);
  const removeDweller = useSaveStore((s) => s.removeDweller);
  const [confirmEvict, setConfirmEvict] = useState(false);

  const firstName = sel?.name ?? '';
  const lastName = sel?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || 'this dweller';
  const level = (sel as { experience?: { currentLevel?: number } } | undefined)
    ?.experience?.currentLevel ?? 1;

  // Pregnancy applies only to female dwellers (gender 1).
  const isFemale = dweller.gender === 1;
  const pregnant = !!(sel as { pregnant?: boolean } | undefined)?.pregnant;
  const babyReady = !!(sel as { babyReady?: boolean } | undefined)?.babyReady;

  return (
    <div className="space-y-6 px-2 pt-4">
      {/* Name editing — shown for everyone, children included */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Name</h3>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="other-first-name" className="text-zinc-400 text-xs">First name</label>
            <input
              id="other-first-name"
              type="text"
              value={firstName}
              onChange={(e) => updateRaw((d) => setName(d, { name: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="other-last-name" className="text-zinc-400 text-xs">Last name</label>
            <input
              id="other-last-name"
              type="text"
              value={lastName}
              onChange={(e) => updateRaw((d) => setName(d, { lastName: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Adult-only sections: children only get Name + Danger Zone. */}
      {!dweller.isChild && (
        <>
          {/* Gender */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Gender</h3>
            <div className="flex gap-2">
              {[{ v: 1, label: 'Female' }, { v: 2, label: 'Male' }].map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={dweller.gender === v}
                  onClick={() => updateRaw((d) => setGender(d, v, index ?? undefined))}
                  className={[
                    'px-3 py-1.5 rounded text-sm font-medium',
                    dweller.gender === v ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-zinc-500 text-xs">
              Changing gender re-derives gender-specific visuals. Outfits or hair with no art for the
              new gender fall back to the default.
            </p>
          </div>

          {/* Level (1..50) */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Level</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_LEVEL}
                max={MAX_LEVEL}
                value={level}
                onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
                className="flex-1 accent-green-500"
              />
              <input
                type="number"
                min={MIN_LEVEL}
                max={MAX_LEVEL}
                value={level}
                onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
                className="w-20 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center"
              />
            </div>
            <p className="text-zinc-500 text-xs">
              Sets the dweller's level ({MIN_LEVEL}–{MAX_LEVEL}). Experience is reset to the start of the level.
            </p>
          </div>

          {/* Pregnancy — female dwellers only */}
          {isFemale && (
            <div className="space-y-3">
              <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Pregnancy</h3>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={pregnant}
                  onChange={(e) => updateRaw((d) => setPregnancy(d, { pregnant: e.target.checked }))}
                  className="accent-green-400"
                />
                Pregnant
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={babyReady}
                  disabled={!pregnant}
                  onChange={(e) => updateRaw((d) => setPregnancy(d, { babyReady: e.target.checked }))}
                  className="accent-green-400 disabled:opacity-50"
                />
                <span className={pregnant ? '' : 'opacity-50'}>Baby Ready</span>
              </label>
              <p className="text-zinc-500 text-xs">
                “Baby Ready” marks the pregnancy as ready to deliver. Requires Pregnant to be set.
              </p>
            </div>
          )}

          {/* Skin color */}
          <ColorPalette
            label="Skin color"
            value={dweller.skinColor ?? { r: 255, g: 224, b: 196 }}
            swatches={SKIN_PRESETS}
            onChange={(c) => onChange({ skinColor: c })}
          />
        </>
      )}

      {/* Evict (remove) the dweller — Danger Zone, shown for everyone */}
      <div className="space-y-3 pt-2 border-t border-zinc-700">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Danger Zone</h3>
        <button
          type="button"
          onClick={() => setConfirmEvict(true)}
          className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
        >
          Evict Dweller
        </button>
        <p className="text-zinc-500 text-xs">
          Permanently removes this dweller from the vault.
        </p>
      </div>

      <ConfirmModal
        open={confirmEvict}
        title="Evict Dweller"
        danger
        confirmLabel="Evict"
        message={
          <span>
            Are you sure you want to evict <span className="font-semibold text-zinc-100">{fullName}</span>?
            This permanently removes them from the vault.
          </span>
        }
        onCancel={() => setConfirmEvict(false)}
        onConfirm={() => {
          if (sel) removeDweller(sel.serializeId);
          setConfirmEvict(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/OthersTab.test.tsx`
Expected: PASS (the 2 existing name-edit tests for the adult dweller, plus the new child test).

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/OthersTab.tsx tests/OthersTab.test.tsx
git commit -m "feat(editor): Others tab shows only Name + Danger Zone for children"
```

---

## Task 4: Wire child mode into DwellerEditor

**Files:**
- Modify: `src/components/DwellerEditor.tsx`

This task wires the pieces together: no early child lock, conditional tabs and avatar,
and a fallback for the active tab. There is no unit test for `DwellerEditor` (it mounts
the WebGL `DwellerCanvas`, which is not unit-tested; the same applies in the existing
suite). Verification is `tsc` + the full suite + a manual check.

- [ ] **Step 1: Replace `src/components/DwellerEditor.tsx` with:**

```tsx
import { useState, useEffect } from 'react';
import { DwellerCanvas } from './DwellerCanvas';
import { ChildAvatar } from './editor/ChildAvatar';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { FacialHairTab } from './editor/FacialHairTab';
import { OutfitTab } from './editor/OutfitTab';
import { WeaponTab } from './editor/WeaponTab';
import { PetTab } from './editor/PetTab';
import { WeaponBadge } from './WeaponBadge';
import { OutfitBadge } from './OutfitBadge';
import { StatsTab } from './editor/StatsTab';
import { OthersTab } from './editor/OthersTab';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { useSaveStore } from '../store/saveStore';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';
import { randomDwellerInput, type DwellerCustomization } from '../lib/dwellerEdit';

export function DwellerEditor({ dweller, name }: { dweller: RenderableDweller; name?: string }) {
  const [active, setActive] = useState('hair');
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useSaveStore((s) => s.updateSelectedDweller);
  const addDweller = useSaveStore((s) => s.addDweller);

  useEffect(() => { loadSpriteIndex().then(setIndex).catch((e) => setError(e.message)); }, []);

  const onChange = (patch: DwellerCustomization) => update(patch);

  const isChild = !!dweller.isChild;
  const isMale = dweller.gender === 2;

  // Children get only SPECIAL and a reduced Others tab; everything that needs a
  // rendered model (hair/outfit/weapon/pet/facial hair) is hidden.
  const tabs: EditorTab[] = isChild
    ? [
        { id: 'stats', label: 'SPECIAL' },
        { id: 'others', label: 'Others' },
      ]
    : [
        { id: 'hair', label: 'Hair' },
        ...(isMale ? [{ id: 'facialHair', label: 'Facial Hair' }] : []),
        { id: 'outfit', label: 'Outfit' },
        { id: 'weapon', label: 'Weapon' },
        { id: 'pet', label: 'Pet' },
        { id: 'stats', label: 'SPECIAL' },
        { id: 'others', label: 'Others' },
      ];

  // Fall back to the first available tab when the current one isn't offered (e.g.
  // the default 'hair' for a child, or switching between a child and an adult).
  const activeTab = tabs.some((t) => t.id === active) ? active : tabs[0].id;

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: character name + portrait (fills available height) */}
      <div className="flex-shrink-0 flex flex-col min-h-0">
        {name && <div className="text-lg font-medium mb-2 truncate">{name}</div>}
        <div className="flex-1 min-h-0 flex">
          <div className="h-full relative" style={{ aspectRatio: '170 / 221' }}>
            {isChild ? (
              <ChildAvatar />
            ) : (
              <>
                <DwellerCanvas dweller={dweller} fill />
                <OutfitBadge dweller={dweller} />
                <WeaponBadge />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Chrome-style tab strip (with close button) above scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <EditorTabBar tabs={tabs} active={activeTab} onSelect={setActive} />
          </div>
          <button
            type="button"
            aria-label="Add a new dweller"
            title="Add a new dweller"
            onClick={() => addDweller(randomDwellerInput())}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            Add New Dweller
          </button>
        </div>
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && activeTab === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'facialHair' && isMale && <FacialHairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
          {activeTab === 'weapon' && <WeaponTab dweller={dweller} />}
          {activeTab === 'pet' && <PetTab dweller={dweller} />}
          {activeTab === 'stats' && <StatsTab dweller={dweller} />}
          {activeTab === 'others' && <OthersTab dweller={dweller} onChange={onChange} index={index} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, import `C:\Users\pc\AppData\Local\FalloutShelter\Vault1.sav`, open the
child dweller **Lauren Lipa** from the footer, and confirm:
- The portrait slot shows the skeleton + a "Child" marker (no model, no outfit/weapon badge).
- Only the **SPECIAL** and **Others** tabs are present.
- SPECIAL values are editable.
- Others shows only **Name** (editable) and **Danger Zone** (Evict); no Gender/Level/Pregnancy/Skin color.
- Selecting an adult dweller restores the full tab set and the rendered avatar.

- [ ] **Step 5: Commit**

```bash
git add src/components/DwellerEditor.tsx
git commit -m "feat(editor): child dweller mode (skeleton avatar, reduced tabs)"
```

---

## Final verification

- [ ] `npm test` — all green.
- [ ] `npx tsc -b` — no errors.
- [ ] `npm run build` — production build succeeds.
- [ ] Manual: child (Lauren Lipa) and an adult dweller both behave per Task 4 Step 4.
