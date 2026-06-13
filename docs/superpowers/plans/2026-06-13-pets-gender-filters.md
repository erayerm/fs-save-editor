# Pet Picker, Gender Change & Weapon/Outfit Sort-Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pet picker (selectable like weapons/outfits), a gender switch in the Others tab, and a sort/filter bar for the weapon and outfit pickers.

**Architecture:** A build-time Node pipeline extracts the authoritative pet catalog and icons from the game files into `public/atlas/pets.json` (mirroring the existing weapon pipeline). At runtime a `petIndex` loader feeds a `PetTab` grid; pure editors in `dwellerEdit.ts` write `equippedPet` / `gender`. Sorting/filtering is pure presentation logic in a shared `SortFilterBar`.

**Tech Stack:** TypeScript, React, Zustand, Vite, Vitest. Node ESM scripts for asset extraction. Tailwind for styling.

**Branch:** `20260613-pets-gender-filters` (already created; do NOT work on `master`).

---

## Background facts (verified against the game files)

Game files: `TEMPORARY-game-files/export-3/ExportedProject/Assets` (same source the weapon pipeline uses).

- **Pet save shape** (on the dweller, key is `equippedPet` — double-p):
  ```json
  "equippedPet": {
    "id": "germanshepherd_l", "type": "Pet",
    "hasBeenAssigned": false, "hasRandonWeaponBeenAssigned": false,
    "extraData": { "uniqueName": "Dogmeat", "bonus": "ObjectiveMultiplier", "bonusValue": 3 }
  }
  ```
- **Catalog source:** `MonoBehaviour/PetsCustomizationData.asset` → `m_petDataList`. Each entry:
  ```yaml
  - m_id: blacklab_c
    m_baseName: Black Lab
    m_Item:
      m_itemRarity: 2          # 2=Normal, 3=Rare, 4=Legendary
      m_Sprite: BlackLabrador_FullBody
      m_HeadSprite: BlackLabrador_Head
      m_type: 0                # EPetType: 0=Dog 1=Cat 2=Macaw 3=FloatingDrone 4=Rollerbrain
      m_breed: 0
      m_bonusEffectList:
      - m_bonusEffect: 67108864   # EBonusEffect bit value
        m_minValue: 6
        m_maxValue: 10
  ```
- **Bonus enum:** `Scripts/Assembly-CSharp/EBonusEffect.cs` maps the int (e.g. `536870912 → ObjectiveMultiplier`, `1048576 → DamageBoost`, `-2147483647 → ChildMultiplier`). The save stores the enum **name** string.
- **Pet name pools:** `PetsCustomizationData.asset` → `m_randomNames` (by `Type`), used for Rare pets.
- **Icons:** `Resources/atlas/Pet_{Dogs,Cats,Macaws,FloatingDrone,Rollerbrain}_HD.prefab` + matching `.png`. Sprite names are `<Sprite>`/`<HeadSprite>` (e.g. `BlackLabrador_Head`).
- **uniqueName rule** (`DwellerPetItem.GenerateRandomData`): Normal → breed name, Rare → a name-pool entry, Legendary → `m_baseName`.

**Decision (from spec):** every rarity variant is its own card. `bonusValue` written = the variant's range **maximum** (`m_maxValue`).

---

## File structure

**Build pipeline (Node, not shipped):**
- Create `scripts/lib/parseEBonusEffect.mjs` — parse `EBonusEffect.cs` → `{ intValue: name }` map. Pure, tested.
- Create `scripts/lib/parsePetData.mjs` — parse `PetsCustomizationData.asset` → array of pet records. Pure, tested.
- Create `scripts/build-pet-data.mjs` — wire the two parsers + name pools, write generated `scripts/lib/petData.mjs`.
- Create `scripts/lib/petData.mjs` — GENERATED authoritative pet catalog (committed, do-not-hand-edit).
- Modify `scripts/build-sprite-index.mjs` — add a pet section that writes `public/atlas/pets.json` and copies the pet atlas PNGs (mirrors the weapons section).
- Modify `package.json` — add `build:petdata` script.

**Runtime (shipped):**
- Create `src/types/pets.ts` — `PetMeta`, `PetIndex`.
- Create `src/lib/petIndex.ts` — fetch+cache loader (mirror `weaponIndex.ts`).
- Modify `src/lib/dwellerEdit.ts` — add `setPet`, `clearPet`, `setGender`.
- Modify `src/lib/dwellerEdit.test.ts` — tests for the three new editors.
- Create `src/components/editor/PetTab.tsx` — pet picker grid.
- Modify `src/components/DwellerEditor.tsx` — add the Pet tab.
- Modify `src/components/editor/OthersTab.tsx` — add the Gender section.
- Create `src/lib/pickerSort.ts` — pure sort/filter helpers for weapons & outfits.
- Create `src/lib/pickerSort.test.ts` — tests for the helpers.
- Create `src/components/editor/SortFilterBar.tsx` — the control bar.
- Modify `src/components/editor/WeaponTab.tsx` — add damage sort.
- Modify `src/components/editor/OutfitTab.tsx` — add SPECIAL filter + sort.

**Generated/output (committed):** `scripts/lib/petData.mjs`, `public/atlas/pets.json`, `public/atlas/Pet_Dogs_HD.png`, `public/atlas/Pet_Cats_HD.png`, `public/atlas/Pet_Macaws_HD.png` (and FloatingDrone/Rollerbrain if referenced).

---

## Phase A — Pet data pipeline

### Task 1: Parse the EBonusEffect enum

**Files:**
- Create: `scripts/lib/parseEBonusEffect.mjs`
- Test: `scripts/lib/parseEBonusEffect.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/parseEBonusEffect.test.mjs
import { describe, it, expect } from 'vitest';
import { parseEBonusEffect } from './parseEBonusEffect.mjs';

const SAMPLE = `public enum EBonusEffect
{
\tNone = 1,
\tDamageBoost = 1048576,
\tObjectiveMultiplier = 536870912,
\tResistance = int.MinValue,
\tChildMultiplier = -2147483647,
}`;

describe('parseEBonusEffect', () => {
  it('maps positive int values to enum names', () => {
    const m = parseEBonusEffect(SAMPLE);
    expect(m.get(1048576)).toBe('DamageBoost');
    expect(m.get(536870912)).toBe('ObjectiveMultiplier');
  });
  it('handles negative and int.MinValue members', () => {
    const m = parseEBonusEffect(SAMPLE);
    expect(m.get(-2147483648)).toBe('Resistance');
    expect(m.get(-2147483647)).toBe('ChildMultiplier');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/parseEBonusEffect.test.mjs`
Expected: FAIL with "Failed to resolve import" / `parseEBonusEffect is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/parseEBonusEffect.mjs
/**
 * Parse EBonusEffect.cs into a Map<intValue, enumName>.
 * Handles plain ints, negatives, and the `int.MinValue` literal (-2147483648).
 * @param {string} text raw contents of EBonusEffect.cs
 * @returns {Map<number, string>}
 */
export function parseEBonusEffect(text) {
  const map = new Map();
  const re = /^\s*([A-Za-z_]\w*)\s*=\s*(int\.MinValue|-?\d+)\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const value = m[2] === 'int.MinValue' ? -2147483648 : Number(m[2]);
    map.set(value, name);
  }
  return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/parseEBonusEffect.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parseEBonusEffect.mjs scripts/lib/parseEBonusEffect.test.mjs
git commit -m "feat(pipeline): parse EBonusEffect enum int->name map"
```

---

### Task 2: Parse the pet data list

**Files:**
- Create: `scripts/lib/parsePetData.mjs`
- Test: `scripts/lib/parsePetData.test.mjs`

Each `m_petDataList` entry has top-level `m_id`/`m_baseName` and a nested `m_Item` block with
`m_itemRarity`, `m_Sprite`, `m_HeadSprite`, `m_type`, `m_breed`, and a `m_bonusEffectList`
whose first entry has `m_bonusEffect`/`m_minValue`/`m_maxValue`. Entries are separated by the
`- m_id:` list marker.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/parsePetData.test.mjs
import { describe, it, expect } from 'vitest';
import { parsePetData } from './parsePetData.mjs';

const SAMPLE = `  m_petDataList:
  - m_id: blacklab_c
    m_baseName: Black Lab
    m_Item:
      m_itemRarity: 2
      m_Sprite: BlackLabrador_FullBody
      m_HeadSprite: BlackLabrador_Head
      m_type: 0
      m_breed: 0
      m_bonusEffectList:
      - m_bonusEffect: 67108864
        m_minValue: 6
        m_maxValue: 10
      m_audioEventOverridesByAudioID: []
  - m_id: blacklab_l
    m_baseName: Old Yeller
    m_Item:
      m_itemRarity: 4
      m_Sprite: BlackLabrador_FullBody
      m_HeadSprite: BlackLabrador_Head
      m_type: 0
      m_breed: 0
      m_bonusEffectList:
      - m_bonusEffect: 134217728
        m_minValue: 3
        m_maxValue: 3
      m_audioEventOverridesByAudioID: []`;

describe('parsePetData', () => {
  it('parses every pet entry with its first bonus effect', () => {
    const pets = parsePetData(SAMPLE);
    expect(pets).toHaveLength(2);
    expect(pets[0]).toEqual({
      id: 'blacklab_c', baseName: 'Black Lab', rarity: 2, type: 0, breed: 0,
      headSprite: 'BlackLabrador_Head', fullBodySprite: 'BlackLabrador_FullBody',
      bonusEffect: 67108864, minValue: 6, maxValue: 10,
    });
  });
  it('captures the legendary base name', () => {
    const pets = parsePetData(SAMPLE);
    expect(pets[1].baseName).toBe('Old Yeller');
    expect(pets[1].rarity).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/parsePetData.test.mjs`
Expected: FAIL with `parsePetData is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/lib/parsePetData.mjs
/**
 * Parse the m_petDataList block of PetsCustomizationData.asset into pet records.
 * Each record uses the FIRST entry of m_bonusEffectList (pets define one bonus).
 * @param {string} text raw contents of PetsCustomizationData.asset
 * @returns {Array<{id:string,baseName:string,rarity:number,type:number,breed:number,
 *   headSprite:string,fullBodySprite:string,bonusEffect:number,minValue:number,maxValue:number}>}
 */
export function parsePetData(text) {
  const start = text.indexOf('m_petDataList:');
  const body = start >= 0 ? text.slice(start) : text;
  // Split on the list marker for each pet entry ("  - m_id:").
  const chunks = body.split(/\n\s{2}-\s+m_id:\s*/).slice(1);
  const grab = (s, re) => s.match(re)?.[1];
  const pets = [];
  for (const raw of chunks) {
    const chunk = 'm_id: ' + raw;
    const id = grab(chunk, /^m_id:\s*(\S+)/);
    if (!id) continue;
    const bonus = chunk.match(/m_bonusEffect:\s*(-?\d+)\s*\n\s*m_minValue:\s*(-?\d+(?:\.\d+)?)\s*\n\s*m_maxValue:\s*(-?\d+(?:\.\d+)?)/);
    pets.push({
      id,
      baseName: grab(chunk, /^\s*m_baseName:\s*(.+?)\s*$/m) ?? id,
      rarity: Number(grab(chunk, /m_itemRarity:\s*(\d+)/) ?? 0),
      type: Number(grab(chunk, /m_type:\s*(\d+)/) ?? 0),
      breed: Number(grab(chunk, /m_breed:\s*(\d+)/) ?? 0),
      headSprite: grab(chunk, /m_HeadSprite:\s*(\S+)/) ?? '',
      fullBodySprite: grab(chunk, /m_Sprite:\s*(\S+)/) ?? '',
      bonusEffect: bonus ? Number(bonus[1]) : 0,
      minValue: bonus ? Number(bonus[2]) : 0,
      maxValue: bonus ? Number(bonus[3]) : 0,
    });
  }
  return pets;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/parsePetData.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parsePetData.mjs scripts/lib/parsePetData.test.mjs
git commit -m "feat(pipeline): parse PetsCustomizationData pet list"
```

---

### Task 3: Generate the pet catalog (petData.mjs)

**Files:**
- Create: `scripts/build-pet-data.mjs`
- Create (generated, by running it): `scripts/lib/petData.mjs`
- Modify: `package.json` (add script)

The generator resolves: bonus name (via EBonusEffect map), rarity label
(2→Normal, 3→Rare, 4→Legendary), `EPetType` label (0 Dog, 1 Cat, 2 Macaw, 3 FloatingDrone,
4 Rollerbrain), a default `uniqueName` (Normal→breed display name, Rare→first matching name
pool entry, Legendary→`baseName`), a human `bonusLabel`, and `bonusValue` = `maxValue`.
Breed display names come from `EPetBreed.cs` enum names split to words.

- [ ] **Step 1: Write the generator**

```js
// scripts/build-pet-data.mjs
// Generate scripts/lib/petData.mjs from the AUTHORITATIVE game data:
//   - MonoBehaviour/PetsCustomizationData.asset : m_petDataList (+ m_randomNames pools)
//   - Scripts/Assembly-CSharp/EBonusEffect.cs    : bonus int -> name
//   - Scripts/Assembly-CSharp/EPetBreed.cs        : breed int -> name
// Usage: node scripts/build-pet-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEBonusEffect } from './lib/parseEBonusEffect.mjs';
import { parsePetData } from './lib/parsePetData.mjs';

const ROOT = 'TEMPORARY-game-files/export-3/ExportedProject/Assets';
const PCD = join(ROOT, 'MonoBehaviour/PetsCustomizationData.asset');
const EBONUS = join(ROOT, 'Scripts/Assembly-CSharp/EBonusEffect.cs');
const EBREED = join(ROOT, 'Scripts/Assembly-CSharp/EPetBreed.cs');
const OUT = 'scripts/lib/petData.mjs';

const RARITY = { 2: 'Normal', 3: 'Rare', 4: 'Legendary' };
const PET_TYPE = { 0: 'Dog', 1: 'Cat', 2: 'Macaw', 3: 'FloatingDrone', 4: 'Rollerbrain' };

// breed int -> display name (split CamelCase to words).
function parseBreeds(text) {
  const map = new Map();
  const re = /^\s*([A-Za-z]\w*)\s*=\s*(\d+)\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    map.set(Number(m[2]), m[1].replace(/([a-z])([A-Z])/g, '$1 $2'));
  }
  return map;
}

// First name pool (Type: 0 = dog pool) as a representative Rare name.
function firstNamePool(text) {
  const block = text.match(/m_randomNames:\s*\n\s*-\s*Type:\s*\d+\s*\n\s*NamePool:\s*([\s\S]*?)(?=\n\s*-\s*Type:|\n\s*m_[A-Za-z])/);
  const first = block?.[1].match(/-\s*(.+)/)?.[1]?.trim();
  return first ?? null;
}

const bonusMap = parseEBonusEffect(readFileSync(EBONUS, 'utf8'));
const breedMap = parseBreeds(readFileSync(EBREED, 'utf8'));
const sampleRareName = firstNamePool(readFileSync(PCD, 'utf8')) ?? 'Buddy';
const pets = parsePetData(readFileSync(PCD, 'utf8'));

function uniqueNameFor(p, breedName) {
  if (p.rarity === 4) return p.baseName;       // Legendary: fixed base name
  if (p.rarity === 3) return sampleRareName;    // Rare: representative pool name
  return breedName;                             // Normal: breed name
}

const records = pets.map((p) => {
  const bonus = bonusMap.get(p.bonusEffect) ?? String(p.bonusEffect);
  const breedName = breedMap.get(p.breed) ?? p.baseName;
  return {
    id: p.id,
    name: breedName,
    type: PET_TYPE[p.type] ?? 'Dog',
    breed: breedName,
    rarity: RARITY[p.rarity] ?? 'Normal',
    bonus,
    bonusValue: p.maxValue,
    bonusLabel: `${bonus} +${p.maxValue}`,
    uniqueName: uniqueNameFor(p, breedName),
    headSprite: p.headSprite,
    fullBodySprite: p.fullBodySprite,
  };
});
records.sort((a, b) => a.id.localeCompare(b.id));

const body = records.map((r) => `  ${JSON.stringify(r.id)}: ${JSON.stringify(r)},`).join('\n');
const file = `/**
 * Authoritative Fallout Shelter pet data.
 *
 * GENERATED by scripts/build-pet-data.mjs from PetsCustomizationData.asset,
 * EBonusEffect.cs and EPetBreed.cs. Do not edit by hand — re-run the generator.
 * ${records.length} pet variants.
 *
 * id: the literal m_petId stored in saves (equippedPet.id).
 */

// prettier-ignore
export const PET_DATA = {
${body}
};
`;
writeFileSync(OUT, file);
console.log(`Wrote ${OUT} — ${records.length} pets`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add after `"build:index"`:

```json
    "build:petdata": "node scripts/build-pet-data.mjs",
```

- [ ] **Step 3: Run the generator**

Run: `node scripts/build-pet-data.mjs`
Expected: prints `Wrote scripts/lib/petData.mjs — <N> pets` (N is roughly 100+).

- [ ] **Step 4: Spot-check generated data against real save ids**

Run:
```bash
node -e "import('./scripts/lib/petData.mjs').then(({PET_DATA})=>{for(const id of ['germanshepherd_l','manx_l3','pitbullterrier_l2','persian_r']) console.log(id, PET_DATA[id] ? JSON.stringify({bonus:PET_DATA[id].bonus,rarity:PET_DATA[id].rarity}) : 'MISSING');})"
```
Expected: each id prints a record (not MISSING) with a plausible bonus/rarity (e.g. `germanshepherd_l ... ObjectiveMultiplier ... Legendary`). If an id is MISSING, the parser's entry-splitting needs adjustment — fix `parsePetData` before continuing.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-pet-data.mjs scripts/lib/petData.mjs package.json
git commit -m "feat(pipeline): generate authoritative pet catalog"
```

---

### Task 4: Emit pets.json + copy pet atlases (build-sprite-index)

**Files:**
- Modify: `scripts/build-sprite-index.mjs` (append a pet section near the weapons section, ~line 436)

Pet head sprites live across several `Pet_*_HD` atlases. Build a combined sprite map from
every `Pet_*_HD.prefab`, copy each referenced PNG, and resolve each pet's `headSprite`
(preferred) or `fullBodySprite` to a rect. Reuse `parseNguiAtlas` + `pngSize`.

- [ ] **Step 1: Add the import**

At the top of `scripts/build-sprite-index.mjs`, after the `weaponData` import (line 12), add:

```js
import { PET_DATA } from './lib/petData.mjs';
```

- [ ] **Step 2: Append the pet section**

After the weapons block (immediately before the final `console.log(...)` for `index.json`, around line 439), add:

```js
// ---------------------------------------------------------------------------
// Pet icons from the Pet_*_HD atlases. Pets reference a head sprite (preferred)
// or a full-body sprite; we resolve against a combined sprite map and copy the
// PNGs that actually get used. (readdirSync/copyFileSync/writeFileSync, join,
// parseNguiAtlas, pngSize, UI_ATLAS_DIR and OUT_DIR are all already in scope.)
// ---------------------------------------------------------------------------
const petAtlasPrefabs = readdirSync(UI_ATLAS_DIR).filter((f) => /^Pet_.*_HD\.prefab$/.test(f));
const petSpriteToAtlas = new Map(); // spriteName -> { atlasPng, rect, aw, ah }
const petAtlasSizes = new Map();
for (const prefab of petAtlasPrefabs) {
  const png = prefab.replace('.prefab', '.png');
  const sprites = parseNguiAtlas(join(UI_ATLAS_DIR, prefab));
  if (sprites.size === 0) continue;
  const size = pngSize(join(UI_ATLAS_DIR, png));
  petAtlasSizes.set(png, size);
  for (const [name, rect] of sprites) {
    if (!petSpriteToAtlas.has(name)) petSpriteToAtlas.set(name, { atlasPng: png, rect, aw: size.w, ah: size.h });
  }
}

const usedPetAtlases = new Set();
let petIconCount = 0;
const petsOutput = {
  version: 1,
  pets: Object.fromEntries(
    Object.entries(PET_DATA).map(([id, p]) => {
      const hit = petSpriteToAtlas.get(p.headSprite) || petSpriteToAtlas.get(p.fullBodySprite);
      let icon = null;
      if (hit) {
        usedPetAtlases.add(hit.atlasPng);
        icon = { atlas: hit.atlasPng, ...hit.rect, aw: hit.aw, ah: hit.ah };
        petIconCount++;
      }
      const { headSprite, fullBodySprite, ...meta } = p;
      return [id, { ...meta, icon }];
    })
  ),
};
for (const png of usedPetAtlases) copyFileSync(join(UI_ATLAS_DIR, png), join(OUT_DIR, png));
writeFileSync(join(OUT_DIR, 'pets.json'), JSON.stringify(petsOutput, null, 2));
console.log(`Wrote ${OUT_DIR}/pets.json — ${petIconCount}/${Object.keys(PET_DATA).length} pets have icons`);
```

- [ ] **Step 3: Run the full index build**

Run: `node scripts/build-sprite-index.mjs`
Expected: prints the existing index/weapon lines PLUS `Wrote public/atlas/pets.json — <N>/<M> pets have icons`, with N close to M (most pets have icons).

- [ ] **Step 4: Verify output files exist and shape is right**

Run:
```bash
node -e "const p=require('./public/atlas/pets.json'); const k=Object.keys(p.pets); console.log('pets',k.length); console.log(JSON.stringify(p.pets['germanshepherd_l']));"
```
Expected: a count and a record with `name`, `type`, `rarity`, `bonus`, `bonusValue`, `bonusLabel`, `uniqueName`, and a non-null `icon` (`atlas`/`x`/`y`/`w`/`h`/`aw`/`ah`).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-sprite-index.mjs public/atlas/pets.json public/atlas/Pet_*_HD.png
git commit -m "build(assets): emit pets.json + pet icon atlases"
```

---

## Phase B — Runtime types + loader

### Task 5: Pet types + index loader

**Files:**
- Create: `src/types/pets.ts`
- Create: `src/lib/petIndex.ts`
- Test: `src/lib/petIndex.test.ts`

- [ ] **Step 1: Write the types**

```ts
// src/types/pets.ts
import type { IconRect } from './icons';

export interface PetMeta {
  id: string;          // save id, e.g. "germanshepherd_l"
  name: string;        // display name (breed)
  type: string;        // Dog | Cat | Macaw | FloatingDrone | Rollerbrain
  breed: string;
  rarity: string;      // Normal | Rare | Legendary
  bonus: string;       // EBonusEffect name, written to extraData.bonus
  bonusValue: number;  // written to extraData.bonusValue (range max)
  bonusLabel: string;  // human label, e.g. "ObjectiveMultiplier +3"
  uniqueName: string;  // default extraData.uniqueName
  icon: IconRect | null;
}
export interface PetIndex { version: 1; pets: Record<string, PetMeta>; }
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/petIndex.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPetIndex, _resetPetCache } from './petIndex';

const INDEX = { version: 1, pets: { germanshepherd_l: { id: 'germanshepherd_l', name: 'German Shepherd', type: 'Dog', breed: 'German Shepherd', rarity: 'Legendary', bonus: 'ObjectiveMultiplier', bonusValue: 3, bonusLabel: 'ObjectiveMultiplier +3', uniqueName: 'Dogmeat', icon: null } } };

describe('loadPetIndex', () => {
  beforeEach(() => { _resetPetCache(); });
  it('fetches and caches the pet index', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INDEX) });
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadPetIndex();
    const b = await loadPetIndex();
    expect(a.pets.germanshepherd_l.bonus).toBe('ObjectiveMultiplier');
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/petIndex.test.ts`
Expected: FAIL with cannot find module `./petIndex`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/lib/petIndex.ts
import type { PetIndex } from '../types/pets';

let cached: PetIndex | null = null;
let pending: Promise<PetIndex> | null = null;

/** Reset module-level cache (for tests only). */
export function _resetPetCache(): void { cached = null; pending = null; }

export async function loadPetIndex(): Promise<PetIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/pets.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load pet index: ${r.status}`);
      return r.json() as Promise<PetIndex>;
    })
    .then((idx) => { cached = idx; return idx; })
    .finally(() => { pending = null; });
  return pending;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/petIndex.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/types/pets.ts src/lib/petIndex.ts src/lib/petIndex.test.ts
git commit -m "feat(pets): pet types + runtime index loader"
```

---

## Phase C — Pet editor

### Task 6: setPet / clearPet pure editors

**Files:**
- Modify: `src/lib/dwellerEdit.ts` (add after `setWeapon`, ~line 162)
- Modify: `src/lib/dwellerEdit.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/dwellerEdit.test.ts`:

```ts
import { setPet, clearPet } from './dwellerEdit';
import type { PetMeta } from '../types/pets';

const PET: PetMeta = {
  id: 'germanshepherd_l', name: 'German Shepherd', type: 'Dog', breed: 'German Shepherd',
  rarity: 'Legendary', bonus: 'ObjectiveMultiplier', bonusValue: 3,
  bonusLabel: 'ObjectiveMultiplier +3', uniqueName: 'Dogmeat', icon: null,
};

describe('setPet / clearPet', () => {
  it('writes equippedPet with extraData', () => {
    const next = setPet(mkDweller(), PET) as any;
    expect(next.equippedPet).toEqual({
      id: 'germanshepherd_l', type: 'Pet',
      hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false,
      extraData: { uniqueName: 'Dogmeat', bonus: 'ObjectiveMultiplier', bonusValue: 3 },
    });
  });
  it('clearPet removes equippedPet', () => {
    const withPet = setPet(mkDweller(), PET);
    const cleared = clearPet(withPet) as any;
    expect(cleared.equippedPet).toBeUndefined();
  });
  it('does not mutate the input', () => {
    const d = mkDweller();
    setPet(d, PET);
    expect((d as any).equippedPet).toBeUndefined();
  });
});
```

(`mkDweller` already exists at the top of the test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: FAIL with `setPet is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dwellerEdit.ts`:

```ts
import type { PetMeta } from '../types/pets';

/**
 * Equip a pet. Pets live on `equippedPet` (note the double-p key, distinct from
 * the single-p `equipedWeapon` / `equipedOutfit`). `extraData` carries the
 * pet's unique name and its single bonus effect + value.
 */
export function setPet(d: Dweller, pet: PetMeta): Dweller {
  return {
    ...d,
    equippedPet: {
      id: pet.id,
      type: 'Pet',
      hasBeenAssigned: false,
      hasRandonWeaponBeenAssigned: false,
      extraData: { uniqueName: pet.uniqueName, bonus: pet.bonus, bonusValue: pet.bonusValue },
    },
  } as unknown as Dweller;
}

/** Remove a dweller's pet. */
export function clearPet(d: Dweller): Dweller {
  const next = { ...(d as Record<string, unknown>) };
  delete next.equippedPet;
  return next as unknown as Dweller;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: PASS (all dwellerEdit tests, including the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dwellerEdit.ts src/lib/dwellerEdit.test.ts
git commit -m "feat(pets): setPet/clearPet pure editors"
```

---

### Task 7: PetTab component + wire into the editor

**Files:**
- Create: `src/components/editor/PetTab.tsx`
- Modify: `src/components/DwellerEditor.tsx`

- [ ] **Step 1: Write the PetTab component**

Mirrors `WeaponTab` (icon via `SpriteCrop`, a pinned "None" card to clear the pet,
selection writes via `updateSelectedDwellerRaw`). Pets are sorted by type, then breed,
then rarity so variants of a breed sit together.

```tsx
// src/components/editor/PetTab.tsx
import { useEffect, useRef, useState } from 'react';
import { loadPetIndex } from '../../lib/petIndex';
import { SpriteCrop } from '../SpriteCrop';
import { setPet, clearPet } from '../../lib/dwellerEdit';
import { useSaveStore } from '../../store/saveStore';
import type { PetIndex, PetMeta } from '../../types/pets';
import type { RenderableDweller } from '../../lib/dwellerRender';

const RARITY_ORDER: Record<string, number> = { Normal: 0, Rare: 1, Legendary: 2 };

export function PetTab({ dweller: _dweller }: { dweller: RenderableDweller }) {
  const [petIndex, setPetIndex] = useState<PetIndex | null>(null);
  const unmounted = useRef(false);

  const equippedId = useSaveStore((s) => {
    const d = s.getSelectedDweller();
    return (d as { equippedPet?: { id?: string } } | null)?.equippedPet?.id;
  });

  useEffect(() => {
    unmounted.current = false;
    loadPetIndex().then((idx) => { if (!unmounted.current) setPetIndex(idx); });
    return () => { unmounted.current = true; };
  }, []);

  if (!petIndex) return <div className="text-zinc-400 text-sm">Loading pets…</div>;

  const pets: PetMeta[] = Object.values(petIndex.pets).sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.breed.localeCompare(b.breed) ||
      (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0),
  );

  return (
    <div className="grid gap-1.5 p-1 pt-4 justify-between" style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}>
      {/* None card — clears the pet (pinned to the front). */}
      <button
        key="__none__"
        title="No pet"
        aria-pressed={!equippedId}
        onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => clearPet(d))}
        className={[
          'rounded border flex flex-col items-center justify-center overflow-hidden transition-colors',
          !equippedId ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
        ].join(' ')}
        style={{ width: 170, height: 170 }}
      >
        <span className="text-sm text-zinc-300">None</span>
      </button>

      {pets.map((pet) => {
        const isEquipped = pet.id === equippedId;
        return (
          <button
            key={pet.id}
            title={`${pet.name} (${pet.rarity})`}
            aria-pressed={isEquipped}
            onClick={() => useSaveStore.getState().updateSelectedDwellerRaw((d) => setPet(d, pet))}
            className={[
              'rounded border flex flex-col items-center overflow-hidden transition-colors',
              isEquipped ? 'border-green-400 bg-green-950/40 ring-1 ring-green-400' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
            ].join(' ')}
            style={{ width: 170, height: 170 }}
          >
            <div className="flex-1 flex items-center justify-center w-full">
              {pet.icon ? <SpriteCrop rect={pet.icon} size={104} title={pet.name} /> : <div className="w-16 h-16" />}
            </div>
            <div className="w-full px-1 pb-1 text-center leading-tight">
              <div className="text-xs font-medium text-zinc-100 truncate">{pet.name}</div>
              <div className="text-[11px] text-zinc-400">{pet.rarity} · {pet.bonusLabel}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire the tab into DwellerEditor**

In `src/components/DwellerEditor.tsx`:
- Add import after the `WeaponTab` import (line 7): `import { PetTab } from './editor/PetTab';`
- Add a tab entry after `{ id: 'weapon', label: 'Weapon' }` (line 53): `{ id: 'pet', label: 'Pet' },`
- Add a render branch after the weapon branch (line 94): `{active === 'pet' && <PetTab dweller={dweller} />}`

- [ ] **Step 3: Verify the build typechecks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open a dweller, click the **Pet** tab. Expected: a grid of pet cards
with icons + "None"; clicking a card selects it (green ring); "None" clears it. (No automated
test for the visual grid; the editors are covered in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/PetTab.tsx src/components/DwellerEditor.tsx
git commit -m "feat(pets): pet picker tab"
```

---

## Phase D — Gender change

### Task 8: setGender pure editor

**Files:**
- Modify: `src/lib/dwellerEdit.ts`
- Modify: `src/lib/dwellerEdit.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/dwellerEdit.test.ts`:

```ts
import { setGender } from './dwellerEdit';

describe('setGender', () => {
  it('sets gender to male (2) / female (1)', () => {
    expect((setGender(mkDweller(), 2) as any).gender).toBe(2);
    expect((setGender(mkDweller(), 1) as any).gender).toBe(1);
  });
  it('coerces any non-2 value to female (1)', () => {
    expect((setGender(mkDweller(), 9) as any).gender).toBe(1);
  });
  it('does not mutate the input', () => {
    const d = mkDweller();
    setGender(d, 2);
    expect(d.gender).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: FAIL with `setGender is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dwellerEdit.ts`:

```ts
/** Set a dweller's gender (1 = female, 2 = male). Any non-2 value becomes female. */
export function setGender(d: Dweller, gender: number): Dweller {
  return { ...d, gender: gender === 2 ? 2 : 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dwellerEdit.ts src/lib/dwellerEdit.test.ts
git commit -m "feat(dweller): setGender pure editor"
```

---

### Task 9: Gender section in the Others tab

**Files:**
- Modify: `src/components/editor/OthersTab.tsx`

- [ ] **Step 1: Add the import**

In `src/components/editor/OthersTab.tsx`, extend the import from `dwellerEdit` (line 3) to include `setGender`:

```ts
import { setName, setPregnancy, setLevel, setGender, MIN_LEVEL, MAX_LEVEL } from '../../lib/dwellerEdit';
```

- [ ] **Step 2: Add the Gender section**

Insert this block right after the Name section's closing `</div>` (after line 67, before the Level section):

```tsx
      {/* Gender */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Gender</h3>
        <div className="flex gap-2">
          {[{ v: 1, label: 'Female' }, { v: 2, label: 'Male' }].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              aria-pressed={dweller.gender === v}
              onClick={() => updateRaw((d) => setGender(d, v))}
              className={[
                'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50',
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
```

- [ ] **Step 3: Verify typecheck + manual smoke check**

Run: `npx tsc -b` (expect no errors). Then `npm run dev`: in Others, switch gender and confirm
the portrait re-renders, the Facial Hair tab appears/disappears, and the pregnancy section
toggles with gender.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/OthersTab.tsx
git commit -m "feat(dweller): gender switch in Others tab"
```

---

## Phase E — Sort / filter

### Task 10: Pure sort/filter helpers

**Files:**
- Create: `src/lib/pickerSort.ts`
- Test: `src/lib/pickerSort.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pickerSort.test.ts
import { describe, it, expect } from 'vitest';
import { sortByDamage, filterAndSortOutfits, type SpecialKey } from './pickerSort';

describe('sortByDamage', () => {
  const w = (id: string, damageMin: number, damageMax: number) => ({ id, damageMin, damageMax });
  it('sorts ascending by average damage', () => {
    const out = sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'asc');
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('sorts descending by average damage', () => {
    const out = sortByDamage([w('a', 10, 20), w('b', 0, 2), w('c', 5, 5)], 'desc');
    expect(out.map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('filterAndSortOutfits', () => {
  const o = (id: string, special: Partial<Record<SpecialKey, number>>) => ({ id, special });
  const items = [o('x', { S: 3 }), o('y', { S: 1, E: 2 }), o('z', { E: 5 })];
  it('keeps only outfits granting the selected stat, sorted desc by that stat', () => {
    const out = filterAndSortOutfits(items, 'S', 'desc');
    expect(out.map((i) => i.id)).toEqual(['x', 'y']);
  });
  it('sorts ascending when asked', () => {
    const out = filterAndSortOutfits(items, 'S', 'asc');
    expect(out.map((i) => i.id)).toEqual(['y', 'x']);
  });
  it('returns all items unchanged when stat is null', () => {
    const out = filterAndSortOutfits(items, null, 'desc');
    expect(out.map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pickerSort.test.ts`
Expected: FAIL with cannot find module `./pickerSort`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/pickerSort.ts
export type SortDir = 'asc' | 'desc';
export type SpecialKey = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

interface HasDamage { damageMin: number; damageMax: number; }
interface HasSpecial { special?: Partial<Record<SpecialKey, number>>; }

const avg = (w: HasDamage) => (w.damageMin + w.damageMax) / 2;

/** Sort a copy of weapons by average damage. */
export function sortByDamage<T extends HasDamage>(items: T[], dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * (avg(a) - avg(b)));
}

/**
 * When `stat` is set, keep only outfits granting that SPECIAL stat and sort by its
 * value; when null, return the items unchanged (caller keeps default order).
 */
export function filterAndSortOutfits<T extends HasSpecial>(items: T[], stat: SpecialKey | null, dir: SortDir): T[] {
  if (!stat) return items;
  const sign = dir === 'asc' ? 1 : -1;
  return items
    .filter((o) => (o.special?.[stat] ?? 0) > 0)
    .sort((a, b) => sign * ((a.special?.[stat] ?? 0) - (b.special?.[stat] ?? 0)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pickerSort.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pickerSort.ts src/lib/pickerSort.test.ts
git commit -m "feat(picker): pure sort/filter helpers for weapons & outfits"
```

---

### Task 11: SortFilterBar component

**Files:**
- Create: `src/components/editor/SortFilterBar.tsx`

A small control bar. Two modes via props: `mode="weapon"` shows only a direction toggle;
`mode="outfit"` shows a SPECIAL selector ("All" + S/P/E/C/I/A/L) plus the direction toggle.

- [ ] **Step 1: Write the component**

```tsx
// src/components/editor/SortFilterBar.tsx
import type { SortDir, SpecialKey } from '../../lib/pickerSort';

const SPECIALS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

export function SortFilterBar({
  mode, dir, onDirChange, stat, onStatChange,
}: {
  mode: 'weapon' | 'outfit';
  dir: SortDir;
  onDirChange: (d: SortDir) => void;
  /** Outfit mode only. */
  stat?: SpecialKey | null;
  onStatChange?: (s: SpecialKey | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1 text-sm">
      {mode === 'outfit' && (
        <label className="flex items-center gap-1 text-zinc-400">
          SPECIAL
          <select
            value={stat ?? ''}
            onChange={(e) => onStatChange?.(e.target.value ? (e.target.value as SpecialKey) : null)}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
          >
            <option value="">All</option>
            {SPECIALS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <label className="flex items-center gap-1 text-zinc-400">
        Sort
        <select
          value={dir}
          onChange={(e) => onDirChange(e.target.value as SortDir)}
          className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
        >
          <option value="desc">{mode === 'weapon' ? 'Damage: high to low' : 'High to low'}</option>
          <option value="asc">{mode === 'weapon' ? 'Damage: low to high' : 'Low to high'}</option>
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc -b`
Expected: no errors (the component is unused until Task 12 — that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/SortFilterBar.tsx
git commit -m "feat(picker): SortFilterBar control"
```

---

### Task 12: Wire sort/filter into the Weapon and Outfit tabs

**Files:**
- Modify: `src/components/editor/WeaponTab.tsx`
- Modify: `src/components/editor/OutfitTab.tsx`

- [ ] **Step 1: Wire WeaponTab**

In `src/components/editor/WeaponTab.tsx`:
- Add imports:
  ```ts
  import { SortFilterBar } from './SortFilterBar';
  import { sortByDamage, type SortDir } from '../../lib/pickerSort';
  ```
- Add state inside the component (after the `equippedId` selector):
  ```ts
  const [dir, setDir] = useState<SortDir>('desc');
  ```
- Replace the `entries` construction (lines 33-36) so the default Fist stays pinned and the rest sort by damage. The weapon entries are `[id, meta]` pairs where `meta` has `damageMin`/`damageMax`:
  ```ts
  const DEFAULT_WEAPON = 'Fist';
  const all = Object.entries(weaponIndex.weapons).map(([id, meta]) => ({ id, ...meta }));
  const def = all.filter((w) => w.id === DEFAULT_WEAPON);
  const rest = sortByDamage(all.filter((w) => w.id !== DEFAULT_WEAPON), dir);
  const entries: [string, typeof all[number]][] = [...def, ...rest].map((w) => [w.id, w]);
  ```
- Wrap the returned grid so the bar sits above it:
  ```tsx
  return (
    <div className="pt-4">
      <SortFilterBar mode="weapon" dir={dir} onDirChange={setDir} />
      <div className="grid gap-1.5 p-1 justify-between" style={{ gridTemplateColumns: 'repeat(auto-fill, 170px)' }}>
        {entries.map(([id, meta]) => { /* unchanged card body */ })}
      </div>
    </div>
  );
  ```
  (Keep the existing card `<button>` body exactly as-is; only the wrapper and `entries` change. Remove the old top-level grid `<div>`'s `pt-4` since the wrapper now owns it.)

- [ ] **Step 2: Verify WeaponTab typecheck + smoke**

Run: `npx tsc -b` (no errors). `npm run dev`: Weapon tab shows a Sort control; switching
high↔low reorders cards; Fist stays first; selecting a weapon still works.

- [ ] **Step 3: Wire OutfitTab**

In `src/components/editor/OutfitTab.tsx`:
- Add imports:
  ```ts
  import { SortFilterBar } from './SortFilterBar';
  import { filterAndSortOutfits, type SortDir, type SpecialKey } from '../../lib/pickerSort';
  ```
- Add state in the `OutfitTab` component (after `const gender = ...`):
  ```ts
  const [dir, setDir] = useState<SortDir>('desc');
  const [stat, setStat] = useState<SpecialKey | null>(null);
  ```
- Replace the `options` mapping so it derives from a filtered/sorted list. `visibleOutfits`
  returns `OutfitItem[]` with `id`, `name`, `special`; the jumpsuit stays pinned when no stat
  filter is active:
  ```ts
  const base = visibleOutfits(index, gender);
  const ordered = stat
    ? filterAndSortOutfits(base, stat, dir)
    : base; // default order already pins jumpsuit to the front
  const options = ordered.map((o) => {
    const thumbnailUrl = thumbnails.get(o.id);
    return { value: o.id, label: o.name, thumbnailUrl, loading: !thumbnailUrl, badge: <SpecialBadges bonus={o.special ?? {}} /> };
  });
  ```
- Render the bar above the grid:
  ```tsx
  return (
    <div className="pt-4">
      <SortFilterBar mode="outfit" dir={dir} onDirChange={setDir} stat={stat} onStatChange={setStat} />
      <OptionGrid options={options} selected={dweller.outfitName ?? null} onSelect={(v) => onChange({ outfitId: v })} showLabel />
    </div>
  );
  ```

- [ ] **Step 4: Verify OutfitTab typecheck + smoke**

Run: `npx tsc -b` (no errors). `npm run dev`: Outfit tab shows SPECIAL + Sort controls;
choosing e.g. `S` filters to Strength outfits sorted by Strength value; "All" restores the
full list with jumpsuit pinned.

- [ ] **Step 5: Run the full test suite + final commit**

Run: `npm test`
Expected: all tests pass.

```bash
git add src/components/editor/WeaponTab.tsx src/components/editor/OutfitTab.tsx
git commit -m "feat(picker): sort/filter bars in Weapon & Outfit tabs"
```

---

## Final verification

- [ ] Run `npm test` — all green.
- [ ] Run `npx tsc -b` — no type errors.
- [ ] Run `npm run build` — production build succeeds.
- [ ] Manual: load `public/demo.sav`, open a dweller. Confirm: Pet tab assigns/clears a pet;
  Others tab switches gender (visuals + facial-hair tab + pregnancy react); Weapon/Outfit
  sort + filter behave; export the save and re-import to confirm it round-trips.
- [ ] Confirm `dev-fixtures/` (decrypted personal Vault3) is NOT staged in any commit
  (`git status` shows it ignored).
```
