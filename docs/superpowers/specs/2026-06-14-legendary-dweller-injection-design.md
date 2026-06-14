# Legendary Dweller Injection — Design

Date: 2026-06-14
Status: Draft (pending in-game verification)

## Goal

Let a user add **legendary dwellers** to their vault through the editor, so they
can complete the "Blast from the Past" Steam achievement (collect N distinct
legendary dwellers). Today the editor can only create plain `rarity: 'Normal'`
dwellers; it has no concept of legendaries.

## Background — what makes a dweller "legendary" (verified from real save + game data)

Decoding a real save (`Vault3.sav`) and cross-referencing the game's own data
(`TEMPORARY-game-files/.../MonoBehaviour/L_*.asset`) established the facts below.

A legendary dweller in the save is an ordinary dweller object with two defining
fields:

- `rarity: "Legendary"`
- `uniqueData: "L_<Character>"` — the **character identity**. This is the asset
  name verbatim (e.g. `L_Jericho`, `L_Mr. Burque`, `L_AlistairTenpenny`). The
  game allows duplicates (the test save had `L_Abraham Washington` twice), so the
  achievement almost certainly counts **distinct `uniqueData` values**, not raw
  legendary count.

The full roster lives as 57 `L_*.asset` MonoBehaviour files. Each defines:

| Asset field | Meaning | Save mapping |
|---|---|---|
| `m_Name` (asset name) | character id | `uniqueData` (verbatim) |
| `m_name` / `m_lastName` | display name | `name` / `lastName` |
| `m_gender` | 1 = male, 2 = female | **inverted**: save `gender` = `m_gender == 1 ? 2 : 1` |
| `m_stats` (S/P/E/C/I/A/L) | SPECIAL | `stats.stats[1..7].value` |
| `m_outfitItemId` | outfit id (already a string) | `equipedOutfit.id` |
| `m_weaponItemId` | weapon id (already a string; may be empty) | `equipedWeapon.id` |
| `m_skinColor` / `m_hairColor` | float `{r,g,b,a}` 0..1 | uint32 ARGB via `encodeArgb` |
| `m_hairPiece` / `m_facemask` | **guid** refs | resolve guid → piece name via `sample-index.json` |
| `m_isHiddenDweller` | quest/special, not in normal lunchbox pool | gates UI (see below) |
| `m_canOnlyAppearInLunchbox` | informational | — |

### Note on the achievement

The feature's job is simply to add real legendary dwellers to the vault. The
"Blast from the Past" Steam achievement is not stored in the save and is out of
our control; whether adding legendaries advances it is the game's business, not a
goal we engineer for. We just produce structurally correct legendaries that the
game accepts and displays as legendaries.

## Approach

Two parts, mirroring the existing pet-data pipeline
(`build-pet-data.mjs` → `scripts/lib/petData.mjs` → `public/atlas/pets.json`):

### 1. Build-time roster extraction

New script `scripts/build-legendary-data.mjs` that:

- Reads every `MonoBehaviour/L_*.asset`.
- Resolves `m_hairPiece` / `m_facemask` guids to piece names using the existing
  guid→name data already extracted in `sample-index.json`.
- Converts `m_skinColor` / `m_hairColor` floats to ARGB uint32.
- Inverts gender to save encoding.
- Emits `public/atlas/legendaries.json`: an array of roster entries
  `{ uniqueData, name, lastName, gender, special: {s,p,e,c,i,a,l}, outfitId,
  weaponId, skinColor, hairColor, hair, faceMask, hidden }`.
- Skips/handles the one malformed entry (`L_SnipSnip`, a Mr. Handy-style record
  with a different shape) explicitly rather than silently.

Output is committed (like `pets.json`) so the app needs no game files at runtime.

### 2. Runtime injection + UI

- `src/lib/legendaryIndex.ts`: load + type the roster JSON.
- `src/lib/dwellerEdit.ts`: new `createLegendaryDweller(entry, existingIds)`,
  modeled on `createDwellerAtDoor` — same "at the vault door"
  (`savedRoom: -1`, `assigned: false`) dweller, but with
  `rarity: 'Legendary'`, `uniqueData`, roster SPECIAL/outfit/weapon/colors/hair/
  faceMask. Empty `weaponId` falls back to `Fist` with
  `hasRandonWeaponBeenAssigned: false` so the game assigns its default.
  **Level**: legendaries from a lunchbox arrive at a random level in **[20, 45]**
  (game source: `DwellerManager.SetupDweller` → `GetRandomDwellerLevel` →
  `GameParameters.prefab m_legendaryDwellerInitialLevel { minLevel: 20,
  maxLevel: 45 }`; confirmed by the real save — the two Abrahams were level 31 and
  42). We mirror this: pick a random level in that range and set it via the
  existing `setLevel` (which the game reads directly on load). SPECIAL base values
  come from the roster; equipment mods and max health are recomputed by the game
  on load.
- Add `rarity` and `uniqueData` to the `Dweller` type in `src/types/save.ts`
  (currently only reachable via the `[k: string]: unknown` index signature).
- `saveStore`: new `addLegendaryDweller(entry)` mirroring `addDweller` —
  appends `createLegendaryDweller(entry, existingIds)`, selects it, navigates to
  the dweller page.
#### UI: split the Add Dweller control into two buttons

Today there is a single green **Add New Dweller** button in the editor header
([DwellerEditor.tsx:80](src/components/DwellerEditor.tsx:80)). Replace it with two
buttons:

- **Custom** — keeps the current behavior exactly:
  `addDweller(randomDwellerInput())` (a random level-1 dweller at the door).
- **Legendary** — opens a modal catalog (does not add anything until confirmed).

#### Legendary catalog modal

A new `LegendaryCatalogModal` component (portal + dimmed backdrop, Escape/backdrop
to close, following the `ConfirmModal` pattern):

- Lists **all** legendary roster entries in a scrollable grid, each shown as an
  **avatar** + name. Avatars are produced by building a `RenderableDweller` from
  the roster entry (via `createLegendaryDweller`) and rendering through the shared
  `useDwellerThumbnail` (same offscreen renderer the rest of the app uses). With
  ~57 entries, render avatars lazily / on-scroll (e.g. `IntersectionObserver` or a
  small virtualized grid) so we don't kick off 57 renders at once.
- **Single selection**: clicking a card selects it (highlighted frame). All
  legendaries — including `hidden` quest characters (Cait, Nick Valentine, etc.) —
  are listed together with no special treatment; they behave identically for our
  purposes.
- **Add button** anchored bottom-right, disabled until a selection exists.
  Clicking it injects the chosen legendary (`addLegendaryDweller(entry)` on the
  store, which calls `createLegendaryDweller`), selects the new dweller, closes
  the modal, and navigates to it — mirroring the current `addDweller` flow.

Optional follow-up (out of scope for v1 unless trivial): multi-select to add
several at once. v1 is single selection + Add.

## Testing

- Unit tests for `createLegendaryDweller` (correct `rarity`/`uniqueData`,
  gender inversion, color encoding, empty-weapon fallback, unique serializeId) —
  follow `dwellerEdit.test.ts`.
- Build-script parse test against a couple of known assets (Jericho, Moira =
  female, Mr. Burque) — follow `parsePetData.test.mjs`.
- Manual in-game verification: inject a legendary into `Vault3.sav`, load the
  game, confirm it renders as a legendary (gold frame, correct
  name/SPECIAL/outfit/weapon) and sits at a level in [20, 45].

## Out of scope

- Anything about the Steam achievement (not in the save, not our concern).
- Editing an existing dweller's rarity to legendary; the catalog picker is the
  supported path.
- `L_SnipSnip` and other non-standard records, beyond not crashing on them.
