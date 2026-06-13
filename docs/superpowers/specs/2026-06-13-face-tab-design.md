# Face Tab — Design

**Date:** 2026-06-13
**Status:** Approved

## Background

The save editor lets users customize a dweller's appearance: hair, facial hair,
outfit, and colors. The dweller's `faceMask` save field currently powers only the
"Facial Hair" tab, which exposes beards and mustaches.

In reality `faceMask` holds **all** vanilla face decorations, not just facial hair.
The game's barbershop (when upgraded) lets players add glasses, the "wrinkles"
aging mask, makeup, scars, a ghoul face, and more — all of which the atlas index
already carries (67 `faceMask` pieces total) but the editor hides. Today only ~14
(beards/mustaches) are reachable.

This was raised by users: "ageing" is just another vanilla facemask called
`wrinkles`, and the editor is also missing glasses and several other vanilla
facial options.

## Goal

Expose every vanilla `faceMask` piece for selection through a single **Face** tab,
covering facial hair, glasses, wrinkles (aging), makeup, scars, and other
decorations, for both genders.

## Key Constraint: `faceMask` Is a Single Slot

`faceMask` is one string field on the dweller. A beard and a pair of glasses both
write to it, so they are **mutually exclusive** — a dweller can wear exactly one
faceMask piece at a time (or none). This is why a single tab is the correct model:
two separate tabs writing the same field would let one selection silently clear the
other.

## Design

### Tab structure

- Add `src/components/editor/FaceTab.tsx`.
- Remove `src/components/editor/FacialHairTab.tsx` (replaced by FaceTab).
- Rename the tab label in the editor tab bar from "Facial Hair" to "Face".
- The tab writes the dweller's `faceMask` save key via the existing
  `DwellerCustomization.facialHair` field (`null` clears it). No save-format
  change; the customization field keeps its current name to avoid churn.

### Layout: grouped grid

The tab renders one `OptionGrid` per category, each under a section heading, in
this order:

1. **Facial Hair**
2. **Glasses**
3. **Makeup**
4. **Scars**
5. **Other** (wrinkles/aging, ghoul face, clown nose, masks, pointy ears, etc.)

A single **None** option appears as a leading cell in the first (Facial Hair)
grid and maps to a `null` save value. Each option uses a
head thumbnail showing the dweller's current head with that piece applied
(mirrors the current Facial Hair tab behavior).

Empty categories (no pieces for the dweller's gender) are not rendered.

### Categorization

Add helpers to `src/lib/spriteIndex.ts`:

- `faceMaskCategory(name: string): FaceMaskCategory` — classifies a piece by name
  pattern into `'facialHair' | 'glasses' | 'makeup' | 'scars' | 'other'`.
  - `facialHair`: existing `isFacialHairPiece(name)` (`f_hair_NN`, or name contains
    `beard`/`mustache`). Kept as-is.
  - `glasses`: name (case-insensitive) contains `glasses`, `sunglasses`, `monocle`,
    `spectacles`, `gogges`/`goggles`, or `eyepatch`.
  - `makeup`: name contains `makeup` or `face_paint`.
  - `scars`: name contains `scar`.
  - `other`: everything else.
  - Classification order is: facialHair → glasses → makeup → scars → other (first
    match wins), so a `glasses2_withBeard` style name resolves deterministically
    (it matches facialHair first via `beard`).
- `faceMaskPieces(idx, gender)` — all `faceMask` pieces for a gender
  (`p.gender === gender || p.gender === 'any'`), regardless of category.
- `faceMaskPiecesByCategory(idx, gender)` — returns the pieces grouped/ordered by
  category for the tab to render.

`isFacialHairPiece` and `facialHairPieces` remain exported (the facialHair category
reuses them); nothing else depends on them being removed.

### Gender behavior

The grid shows pieces valid for the dweller's gender
(`p.gender === dweller.gender || p.gender === 'any'`). Children are not
customizable (existing behavior, unchanged).

Update `setGender` in `src/lib/dwellerEdit.ts`:

- Replace the unconditional "clear `faceMask` when female" rule with a validity
  check, mirroring the existing hair/outfit fallback pattern.
- Add `faceMaskValidForGender(name, gender, idx)`: true if a `faceMask` piece with
  that name exists for the target gender (or is `any`).
- On gender change, if the current `faceMask` is not valid for the new gender, clear
  it (set to `null`); otherwise keep it. A beard (male-only) on a dweller switched
  to female is invalid and therefore cleared — preserving today's outcome for
  beards while keeping female-valid pieces (e.g. `wrinkles`, `glasses`) when the
  piece exists for the new gender.

### Color

`faceMask` is tinted with the dweller's hair color (existing rendering in
`dwellerLayers.ts`). The tab keeps the color palette, relabeled from
"Facial hair color" to "Face color"; it continues to write `hairColor`. No change
to color encoding or to the rendering layer order.

### Thumbnails

Generalize the current `useFacialHairThumbnails` hook into the FaceTab:

- Remove the hard-coded `meshSet.male.adult` / `meshSet.male.offsets` assumption;
  select the mesh and offsets for the dweller's gender.
- Keep the same layer filter (head skin + face + hair + faceMask) and head zoom
  bounds so pieces read clearly.
- Thumbnails are cached per `gender|skin|hair|hairName|pieceName` key.

### Unknown items

Preserve the existing unknown-item guard: if the dweller's `faceMask` is a piece the
editor doesn't know (newer game content or a mod), show the unknown-item card and
warn before overwriting, exactly as the Facial Hair tab does today.

## Out of Scope

- No support for multiple simultaneous face decorations (single-slot constraint is a
  game/save limitation, not an editor choice).
- No new color model for non-beard pieces (wrinkles/scars use hair-color tint as the
  game does; we do not special-case it).
- No changes to hair, outfit, body, or other appearance fields.

## Testing

- `spriteIndex` unit tests: `faceMaskCategory` classifies representative names into
  the right category (beard, glasses, monocle, makeup, scars, wrinkles→other);
  `faceMaskPieces`/`faceMaskPiecesByCategory` filter by gender and group/order
  correctly; `any`-gender pieces appear for both genders.
- `dwellerEdit` unit tests: `setGender` clears a beard when switching male→female,
  keeps a female-valid piece (e.g. `wrinkles`) across a gender change when the piece
  exists for the new gender, and clears an invalid one.
