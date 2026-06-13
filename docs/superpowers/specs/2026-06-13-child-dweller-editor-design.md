# Design: Child Dweller Editor Mode

Date: 2026-06-13
Branch: `20260613-child-dweller-editor`

## Background

Child dwellers (e.g. Lauren Lipa in `Vault1.sav`) are detected by
`isChildDweller` (`experience.currentLevel === 0`). Today the editor fully locks
a child: it renders a placeholder where the avatar would be and a "Child dwellers
cannot be customized." message, with no tabs.

It makes no sense to draw a customizable child model, but children should still be
partially editable. This change introduces a focused "child mode" for the dweller
editor: no avatar (a loading-style skeleton instead), a clear child marker, and a
reduced set of editable fields.

## Requirements (approved)

When `dweller.isChild`:

1. **No avatar.** Replace the WebGL `DwellerCanvas` with the same pulsing skeleton
   used during loading (`bg-zinc-700/40 animate-pulse`), filling the existing
   `170 / 221` avatar box. No `OutfitBadge` / `WeaponBadge`.
2. **Child marker.** A small **"Child" badge** pinned to the top-left corner of the
   skeleton (styled like the unsupported-item badge, but as a neutral/info marker,
   not a warning).
3. **Tabs.** Show only **SPECIAL** and **Others**. Hide Hair, Facial Hair, Outfit,
   Weapon, and Pet.
4. **SPECIAL.** Editable for children (currently disabled).
5. **Others.** Show only the **Name** section (editable) and the **Danger Zone**
   (Evict). Hide Level, Gender, Pregnancy, and Skin color.

Adult dwellers are completely unaffected.

## Components and changes

### `ChildAvatar` (new) — `src/components/editor/ChildAvatar.tsx`
A small presentational component: a rounded box matching the avatar aspect ratio,
containing a full-bleed pulsing skeleton and a "Child" badge in the top-left
corner. No props beyond optional className/size; it renders no dweller art.

- What it does: shows "this is a child, no preview" in the avatar slot.
- Interface: `<ChildAvatar />` (sized by its container, like `DwellerCanvas fill`).
- Depends on: nothing (pure markup + Tailwind).

### `DwellerEditor.tsx` (modify)
- Remove the early `if (dweller.isChild) return <locked view>` block.
- Compute `isChild = !!dweller.isChild`.
- **Tabs:** build conditionally.
  - Child: `[{ id: 'stats', label: 'SPECIAL' }, { id: 'others', label: 'Others' }]`.
  - Adult: the existing full list.
- **Active tab robustness:** the active tab defaults to `'hair'`, which a child
  doesn't have. Derive an effective active tab: if the current `active` id is not
  in the available `tabs`, fall back to `tabs[0].id`. This also keeps selection
  valid when switching between a child and an adult dweller (same editor instance).
- **Avatar:** render `<ChildAvatar />` for a child (no badges); `<DwellerCanvas>` +
  `OutfitBadge` + `WeaponBadge` for an adult, exactly as today.
- **Content:** only `StatsTab` and `OthersTab` are reachable for a child; the
  sprite-index-dependent tabs (hair/outfit/etc.) are never rendered.

### `StatsTab.tsx` (modify)
- SPECIAL becomes editable for children. Remove the `disabled = !!dweller.isChild`
  gating so the number/range inputs are enabled regardless of child status.

### `OthersTab.tsx` (modify)
- For a child, render only the **Name** section and the **Danger Zone**; skip
  Level, Gender, Pregnancy, and Skin color.
- The Name inputs are editable for children (today they are disabled via the
  `disabled = !!dweller.isChild` flag). After this change the child's name is
  editable; the `disabled` flag is no longer driven by child status.
- Adult layout is unchanged (all sections present).

## Data flow

`isChild` is already derived from the save (`isChildDweller`) and attached to the
`RenderableDweller` by `DwellerDetailPanel` / `CharacterCard`. No new save fields.
Editing a child's SPECIAL writes via the existing `setStat` editor; editing the
name writes via `setName`; eviction via the existing `removeDweller`. All existing
pure editors are reused unchanged.

## Testing

- `StatsTab.test.tsx`: for a child dweller, the SPECIAL inputs are **enabled** (not
  disabled).
- `OthersTab.test.tsx`: for a child dweller, only the Name section and Danger Zone
  render (Level / Gender / Pregnancy / Skin color absent), and the Name input is
  enabled.
- `DwellerEditor`: for a child, only the SPECIAL and Others tabs are present, and
  the "Child" marker is shown instead of the dweller canvas. (Covered as far as the
  existing test setup allows; the WebGL canvas is not unit-tested.)
- Manual: load `Vault1.sav`, open Lauren Lipa, confirm skeleton + Child badge, only
  SPECIAL/Others tabs, editable SPECIAL, Name + Danger Zone only in Others, and that
  exporting preserves the rest of the child's data.

## Out of scope

- Rendering an actual child model or any child art.
- Editing Level / Gender / outfit / weapon / pet / hair for children.
- Changing how children appear in the footer `CharacterCard` (already shows "Child").
