# Design: Pet Picker, Gender Change, and Weapon/Outfit Sort-Filter

Date: 2026-06-13
Branch: `20260613-pets-gender-filters`

## Background

The editor is published and getting feature requests. Three were prioritized:

1. **Pet assignment** — there is currently no way to set a dweller's pet. Make pets
   selectable just like weapons and outfits.
2. **Gender change** — add a gender switch in the Others tab (not at dweller creation).
3. **Sort/filter** — add basic sorting and filtering to the weapon and outfit pickers.

Pet support is the hard one and drives most of this spec; the other two are small.

## Data findings (from the game files)

Game files live under `TEMPORARY-game-files/export-3/ExportedProject/Assets`, the same
source the weapon pipeline already uses.

### Pet save shape

A dweller carries a pet on the `equippedPet` key (note: double-p, unlike the
single-p `equipedWeapon` / `equipedOutfit`):

```json
"equippedPet": {
  "id": "germanshepherd_l",
  "type": "Pet",
  "hasBeenAssigned": false,
  "hasRandonWeaponBeenAssigned": false,
  "extraData": { "uniqueName": "Dogmeat", "bonus": "ObjectiveMultiplier", "bonusValue": 3 }
}
```

- `id` = breed (lowercased) + rarity suffix (`_c` common, `_r` rare, `_l`/`_l2`/`_l3`
  legendary variants). Observed real ids: `germanshepherd_l`, `manx_l3`,
  `pitbullterrier_l2`, `greyhound_r`, `persian_r`, `germanpointer_c`, `rottweiler_c`,
  `cattledog_c`, `brittany_c`, `militarymacaw_l`.
- `extraData.bonus` = a bonus-effect enum string (`ObjectiveMultiplier`, `DamageBoost`,
  `RadHealingBoost`, `ChildMultiplier`, `WastelandCapsBoost`, `HappinessBoost`,
  `AddMaxHP`, `FasterCrafting`, `FasterAndCheaperCrafting`, ...).
- `extraData.bonusValue` = the numeric magnitude, drawn from that pet's bonus range.
- `extraData.uniqueName` = display name. Per `DwellerPetItem.GenerateRandomData`:
  Normal → breed name, Rare → random from a name pool, Legendary → fixed base name.

### Authoritative catalog source

- `Scripts/Assembly-CSharp/EPetBreed.cs` — 44 breeds (Dog/Cat/Macaw/Drone/Rollerbrain),
  with `EPetType` mapping in `DwellerPetItem.cs`.
- `DwellerPetItem` MonoBehaviour assets — each serialized pet item exposes `m_petId`,
  `m_breed`, `m_itemRarity`, `m_petBaseName`, `m_Sprite`/`m_HeadSprite`, and a
  `m_bonusEffectList` of `BonusEffect { Effect, MinValue, MaxValue }`.
- `Resources/atlas/Pet_*_HD.prefab` — icon atlases with `<Breed>_Head` / `<Breed>_FullBody`
  sprites, so real pet icons are extractable (same approach as `Weapons_HD`).
- `Resources/I2Languages.prefab` — localized breed / bonus display names.

## Decisions

- **Pet representation:** real pet icons extracted from the game atlases. Cards mirror
  the weapon picker (icon + name + bonus label).
- **Catalog scope:** full catalog. Every pet rarity variant is its own card, shown side
  by side (like the weapon picker shows Rusty/Enhanced/Hardened as separate cards). A
  breed with common/rare/legendary versions appears as up to three cards.
- **bonusValue:** the chosen variant's value. The user picks the rarity variant directly;
  we write that variant's bonus. For variants whose value is a range, write the range
  **maximum** (most users want the strongest).
- **uniqueName:** follow the game rule (Normal = breed name, Rare = a representative
  pool name, Legendary = fixed base name).
- **Filter UI:** a small control bar above the grid (not a large panel).
- **Personal save:** the decrypted Vault3 is kept only under the git-ignored
  `dev-fixtures/` folder for development reference; never committed.
- **Branch:** all work on `20260613-pets-gender-filters`, not `master`.

## Components

### 1. Pet build pipeline

New `scripts/build-pet-data.mjs` (mirrors `scripts/build-weapon-data.mjs`):

- Parse `EPetBreed.cs` + `DwellerPetItem` assets for every pet id, breed, type, rarity,
  base name, head-sprite name, and `m_bonusEffectList` (effect + min/max).
- Resolve display names via `I2Languages.prefab`.
- Emit a generated `scripts/lib/petData.mjs` (authoritative, do-not-hand-edit), the same
  way `weaponData.mjs` is generated.

A second step (mirroring the weapon sprite extraction) crops the `<Breed>_Head` sprites
from the `Pet_*_HD` atlases into a pet icon atlas under `public/atlas/`, and writes
`public/atlas/pets.json`:

```ts
interface PetMeta {
  id: string;        // save id, e.g. "germanshepherd_l"
  name: string;      // display name shown on the card
  type: string;      // Dog | Cat | Macaw | FloatingDrone | Rollerbrain
  breed: string;
  rarity: string;    // Normal | Rare | Legendary
  bonus: string;     // bonus-effect enum string written to extraData.bonus
  bonusLabel: string;// human label, e.g. "Damage +6"
  bonusValue: number;// resolved value (range max)
  uniqueName: string;// default uniqueName per rarity rule
  icon: IconRect | null;
}
interface PetIndex { version: 1; pets: Record<string, PetMeta>; }
```

Runtime loader `src/lib/petIndex.ts` mirrors `weaponIndex.ts` (fetch + cache).
Types in `src/types/pets.ts`.

### 2. Pet tab (UI)

- Add a **Pet** tab to `DwellerEditor` after Weapon (adults only; children remain
  uncustomizable as today).
- New `src/components/editor/PetTab.tsx`, built on the `WeaponTab` pattern:
  - Grid of pet cards (icon via `SpriteCrop`, name, rarity, bonus label).
  - A pinned **None** card at the front that clears the pet (parallels Fist/jumpsuit).
  - Cards grouped/ordered so a breed's rarity variants sit together.
- Pure editors in `src/lib/dwellerEdit.ts` with tests:
  - `setPet(d, petMeta)` → writes `equippedPet` with `{ id, type: 'Pet',
    hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false, extraData: {
    uniqueName, bonus, bonusValue } }`.
  - `clearPet(d)` → removes `equippedPet`.
- A `PetBadge` on the portrait is **out of scope** for this pass (no rendered pet on the
  dweller); only the picker + save write are in scope.

### 3. Gender change (Others tab)

- Add a "Gender" section to `OthersTab.tsx`: a two-option Female / Male control.
- New pure editor `setGender(d, gender)` in `dwellerEdit.ts` (writes `gender` 1↔2),
  with tests.
- Gender-dependent UI re-derives automatically: the Facial Hair tab visibility,
  pregnancy section, and sprite rendering already key off `dweller.gender`.
- Gender-specific pieces (hair/outfit) that become invalid fall back via existing
  behavior (e.g. jumpsuit fallback). No new fallback logic is introduced; if a chosen
  outfit/hair has no visual for the new gender, the existing renderer fallback applies.

### 4. Sort / filter bar (Weapon & Outfit)

- New `src/components/editor/SortFilterBar.tsx`, rendered above the grid in both tabs.
- **Outfit:** a SPECIAL selector (S/P/E/C/I/A/L or "All") plus a direction toggle
  (ascending / descending). Selecting a SPECIAL filters to outfits granting that stat and
  sorts by its bonus value; "All" shows everything in the default order.
- **Weapon:** a direction toggle that sorts by average damage `((min + max) / 2)`.
- Sorting/filtering is presentation-only and preserves the pinned default
  (Fist / jumpsuit / None) at the front.

## Testing

- `dwellerEdit.test.ts`: `setPet`, `clearPet`, `setGender` (shape of written save,
  idempotence, clearing).
- Pet index loader test mirroring `weaponIndex` (cache + fetch shape).
- Sort/filter is pure helper logic (extract to a testable function) with unit tests for
  ordering and SPECIAL filtering.
- Pipeline scripts validated by running them against the game files and spot-checking ids
  against the real values seen in the decrypted Vault3 (e.g. `germanshepherd_l`,
  `manx_l3`, `pitbullterrier_l2`).

## Out of scope

- Rendering the pet on the dweller portrait.
- A rich filter panel (search box, multi-SPECIAL, rarity filter).
- Editing the raw `bonusValue` to an arbitrary number (variants cover the real values).
- Committing any personal save data.
