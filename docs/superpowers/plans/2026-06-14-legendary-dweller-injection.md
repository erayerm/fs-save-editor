# Legendary Dweller Injection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user add real legendary dwellers to their vault via a catalog picker reachable from a new "Legendary" button next to the existing "Custom" add-dweller button.

**Architecture:** A build script extracts the 57-character legendary roster from the game's `L_*.asset` files into `public/atlas/legendaries.json` (mirroring the pet-data pipeline). At runtime, a loader exposes the roster; `createLegendaryDweller` turns a roster entry into a save-shaped dweller (level 20–45, `rarity: "Legendary"`, `uniqueData`); a store action appends it; and a modal catalog lets the user pick one by avatar.

**Tech Stack:** TypeScript, React, Zustand store, Vitest, Node ESM build scripts. Game data under `TEMPORARY-game-files/export-3/ExportedProject/Assets/MonoBehaviour/`.

---

## Background facts (verified)

- A legendary dweller in a save = ordinary dweller + `rarity: "Legendary"` + `uniqueData: "L_<Char>"` (the asset's `m_Name`, verbatim).
- Roster lives in `MonoBehaviour/L_*.asset`. Each defines `m_Name`, `m_name`/`m_lastName`, `m_gender` (1=male, 2=female — **inverted** vs save where male=2/female=1), `m_strength…m_luck`, `m_outfitItemId`, `m_weaponItemId` (string ids; weapon may be empty), `m_skinColor`/`m_hairColor` (float 0..1 `{r,g,b}`), and `m_hairPiece`/`m_facemask` (guid refs).
- Guid → piece name: each `*.asset` has a sibling `*.asset.meta` containing `guid:`; resolve a referenced guid to the target asset's `m_Name`. Verified: Abraham `m_hairPiece` → `18`, `m_facemask` → `wrinkles`; Jericho `m_facemask` → `f_hair_11` (all match the real save).
- Legendaries arrive at a random level in **[20, 45]** (`GameParameters.prefab m_legendaryDwellerInitialLevel { minLevel: 20, maxLevel: 45 }`; real save Abrahams were level 31 and 42).
- Observed health formula: `maxHealth = 105 + (level - 1) * 6` (level 31 → 285, level 42 → 351 in the real save).
- Color encode/decode helpers: `encodeArgb(Rgb)` / `decodeArgb(int)` in `src/lib/colors.ts`.
- Save→Renderable adapter pattern: `toRenderable` in `src/components/CharacterCard.tsx:10`.
- The single "Add New Dweller" button is at `src/components/DwellerEditor.tsx:80-89`.

## File Structure

- Create `scripts/lib/parseLegendaryData.mjs` — pure parser: one `L_*.asset` text + a guid→name resolver → one roster entry (or `null` to skip). No filesystem.
- Create `scripts/lib/parseLegendaryData.test.mjs` — unit test for the parser.
- Create `scripts/build-legendary-data.mjs` — reads the assets, builds the guid→name map, calls the parser, writes `public/atlas/legendaries.json`.
- Create `public/atlas/legendaries.json` — generated roster (committed).
- Create `src/types/legendary.ts` — `LegendaryMeta`, `LegendaryIndex` types.
- Create `src/lib/legendaryIndex.ts` — `loadLegendaryIndex()` + `_resetLegendaryCache()`.
- Modify `src/types/save.ts` — add `rarity?` and `uniqueData?` to `Dweller`.
- Modify `src/lib/dwellerEdit.ts` — add level constants + `createLegendaryDweller`.
- Modify `src/lib/dwellerEdit.test.ts` — tests for `createLegendaryDweller`.
- Modify `src/store/saveStore.ts` — add `addLegendaryDweller`.
- Modify `src/store/saveStore.test.ts` — test `addLegendaryDweller`.
- Create `src/components/LegendaryCatalogModal.tsx` — the modal + roster grid + avatar card.
- Modify `src/components/DwellerEditor.tsx` — split the add button into Custom + Legendary; mount the modal.

---

## Task 1: Legendary asset parser (pure function)

**Files:**
- Create: `scripts/lib/parseLegendaryData.mjs`
- Test: `scripts/lib/parseLegendaryData.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/parseLegendaryData.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { parseLegendaryAsset } from './parseLegendaryData.mjs';

// Trimmed real-shape sample (Jericho: hairPiece none, facemask via guid, empty weapon override uses a real id here).
const JERICHO = `%YAML 1.1
MonoBehaviour:
  m_Name: L_Jericho
  m_hairPiece: {fileID: 0}
  m_outfitItemId: WandererArmor_Heavy
  m_skinColor: {r: 0.9137255, g: 0.83137256, b: 0.7058824, a: 1}
  m_hairColor: {r: 0.4117647, g: 0.34901962, b: 0.3254902, a: 1}
  m_gender: 1
  m_facemask: {fileID: 11400000, guid: FACEGUID, type: 2}
  m_weaponItemId: AssaultRifle_Infiltrator
  m_name: Jericho
  m_lastName:
  m_stats:
    m_strength: 8
    m_perception: 6
    m_endurance: 8
    m_charisma: 2
    m_intelligence: 3
    m_agility: 7
    m_luck: 6
`;

// Entry with an empty weapon and a hairPiece guid, female gender.
const MOIRA = `MonoBehaviour:
  m_Name: L_Moira Brown
  m_hairPiece: {fileID: 11400000, guid: HAIRGUID, type: 2}
  m_outfitItemId: HandymanJumpsuit_Expert
  m_skinColor: {r: 1, g: 1, b: 1, a: 1}
  m_hairColor: {r: 0, g: 0, b: 0, a: 1}
  m_gender: 2
  m_facemask: {fileID: 0}
  m_weaponItemId:
  m_name: Moira
  m_lastName: Brown
  m_stats:
    m_strength: 1
    m_perception: 2
    m_endurance: 3
    m_charisma: 4
    m_intelligence: 5
    m_agility: 6
    m_luck: 7
`;

// A Mr-Handy-style record with no SPECIAL stats — must be skipped.
const SNIP = `MonoBehaviour:
  m_Name: L_SnipSnip
  m_outfitItemId:
`;

const resolve = (guid) => ({ FACEGUID: 'f_hair_11', HAIRGUID: '22' }[guid] ?? null);

describe('parseLegendaryAsset', () => {
  it('parses a male entry, inverts gender, resolves facemask, encodes colors', () => {
    const e = parseLegendaryAsset(JERICHO, resolve);
    expect(e.uniqueData).toBe('L_Jericho');
    expect(e.name).toBe('Jericho');
    expect(e.lastName).toBe('');
    expect(e.gender).toBe(2); // asset 1 (male) -> save 2
    expect(e.outfitId).toBe('WandererArmor_Heavy');
    expect(e.weaponId).toBe('AssaultRifle_Infiltrator');
    expect(e.special).toEqual([8, 6, 8, 2, 3, 7, 6]);
    expect(e.hair).toBeNull();
    expect(e.faceMask).toBe('f_hair_11');
    // 0.9137255*255 ≈ 233, g 212, b 180, a 255 -> 0xFFE9D4B4
    expect(e.skinColor).toBe(0xffe9d4b4);
  });

  it('parses a female entry, resolves hair, keeps empty weapon as empty string', () => {
    const e = parseLegendaryAsset(MOIRA, resolve);
    expect(e.gender).toBe(1); // asset 2 (female) -> save 1
    expect(e.hair).toBe('22');
    expect(e.faceMask).toBeNull();
    expect(e.weaponId).toBe('');
    expect(e.special).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns null for records without SPECIAL stats', () => {
    expect(parseLegendaryAsset(SNIP, resolve)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/parseLegendaryData.test.mjs`
Expected: FAIL — `parseLegendaryAsset` not exported / module not found.

- [ ] **Step 3: Write the parser**

Create `scripts/lib/parseLegendaryData.mjs`:

```js
// Pure parser for a single legendary dweller asset (MonoBehaviour/L_*.asset).
// `resolveGuid(guid) -> pieceName|null` maps a referenced asset .meta guid to
// that asset's m_Name (hair / facemask piece names).

const STAT_KEYS = ['m_strength', 'm_perception', 'm_endurance', 'm_charisma', 'm_intelligence', 'm_agility', 'm_luck'];

function grab(text, re) {
  const m = text.match(re);
  return m ? m[1] : null;
}

// "{fileID: 0}" -> null ; "{fileID: 11400000, guid: abc, type: 2}" -> "abc"
function pieceGuid(text, field) {
  const block = grab(text, new RegExp(`${field}:\\s*\\{([^}]*)\\}`));
  if (block == null) return null;
  const fileId = block.match(/fileID:\s*(\d+)/)?.[1];
  if (!fileId || fileId === '0') return null;
  return block.match(/guid:\s*([0-9a-f]+)/)?.[1] ?? null;
}

function colorInt(text, field) {
  const block = grab(text, new RegExp(`${field}:\\s*\\{([^}]*)\\}`));
  if (block == null) return 0xffffffff;
  const num = (ch) => Number(block.match(new RegExp(`${ch}:\\s*([\\d.]+)`))?.[1] ?? 1);
  const to255 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const r = to255(num('r')), g = to255(num('g')), b = to255(num('b'));
  return ((0xff << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export function parseLegendaryAsset(text, resolveGuid) {
  // Skip records lacking SPECIAL (e.g. Mr-Handy-style L_SnipSnip).
  if (!STAT_KEYS.every((k) => new RegExp(`${k}:\\s*\\d+`).test(text))) return null;

  const uniqueData = grab(text, /^\s*m_Name:\s*(.+?)\s*$/m);
  const assetGender = Number(grab(text, /m_gender:\s*(\d+)/));
  if (!uniqueData || !assetGender) return null;

  const hairGuid = pieceGuid(text, 'm_hairPiece');
  const faceGuid = pieceGuid(text, 'm_facemask');

  return {
    uniqueData,
    name: (grab(text, /^\s*m_name:\s*(.*?)\s*$/m) ?? '').trim(),
    lastName: (grab(text, /^\s*m_lastName:\s*(.*?)\s*$/m) ?? '').trim(),
    gender: assetGender === 1 ? 2 : 1, // invert to save encoding (male=2, female=1)
    special: STAT_KEYS.map((k) => Number(grab(text, new RegExp(`${k}:\\s*(\\d+)`)))),
    outfitId: (grab(text, /m_outfitItemId:\s*(.*?)\s*$/m) ?? '').trim(),
    weaponId: (grab(text, /m_weaponItemId:\s*(.*?)\s*$/m) ?? '').trim(),
    skinColor: colorInt(text, 'm_skinColor'),
    hairColor: colorInt(text, 'm_hairColor'),
    hair: hairGuid ? resolveGuid(hairGuid) : null,
    faceMask: faceGuid ? resolveGuid(faceGuid) : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/parseLegendaryData.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parseLegendaryData.mjs scripts/lib/parseLegendaryData.test.mjs
git commit -m "feat(legendary): pure parser for L_*.asset roster entries"
```

---

## Task 2: Build script → public/atlas/legendaries.json

**Files:**
- Create: `scripts/build-legendary-data.mjs`
- Create (generated): `public/atlas/legendaries.json`

- [ ] **Step 1: Write the build script**

Create `scripts/build-legendary-data.mjs`:

```js
// Generate public/atlas/legendaries.json from the game's L_*.asset roster.
// Usage: node scripts/build-legendary-data.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseLegendaryAsset } from './lib/parseLegendaryData.mjs';

const MB_DIR = 'TEMPORARY-game-files/export-3/ExportedProject/Assets/MonoBehaviour';
const OUT = 'public/atlas/legendaries.json';

const files = readdirSync(MB_DIR);

// metaGuid -> that asset's m_Name (for hair / facemask resolution).
const guidToName = new Map();
for (const f of files) {
  if (!f.endsWith('.asset.meta')) continue;
  const guid = readFileSync(join(MB_DIR, f), 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
  if (!guid) continue;
  const assetName = f.slice(0, -('.meta'.length)); // strip ".meta"
  const name = readFileSync(join(MB_DIR, assetName), 'utf8').match(/^\s*m_Name:\s*(.+?)\s*$/m)?.[1];
  if (name) guidToName.set(guid, name);
}
const resolve = (g) => guidToName.get(g) ?? null;

const legendaries = [];
for (const f of files) {
  if (!f.startsWith('L_') || !f.endsWith('.asset')) continue;
  const entry = parseLegendaryAsset(readFileSync(join(MB_DIR, f), 'utf8'), resolve);
  if (entry) legendaries.push(entry);
}
legendaries.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(OUT, JSON.stringify({ version: 1, legendaries }, null, 2));
console.log(`Wrote ${OUT} — ${legendaries.length} legendaries`);
```

- [ ] **Step 2: Run the build script**

Run: `node scripts/build-legendary-data.mjs`
Expected: prints `Wrote public/atlas/legendaries.json — 57 legendaries` (count may differ slightly; SnipSnip is skipped).

- [ ] **Step 3: Spot-check the output**

Run: `node -e "const d=require('./public/atlas/legendaries.json'); const j=d.legendaries.find(x=>x.uniqueData==='L_Jericho'); console.log(JSON.stringify(j))"`
Expected: Jericho with `gender:2`, `outfitId:"WandererArmor_Heavy"`, `faceMask:"f_hair_11"`, `special:[8,6,8,2,3,7,6]`, numeric `skinColor`/`hairColor`.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-legendary-data.mjs public/atlas/legendaries.json
git commit -m "feat(legendary): build legendaries.json from game roster assets"
```

---

## Task 3: Types + runtime loader

**Files:**
- Create: `src/types/legendary.ts`
- Create: `src/lib/legendaryIndex.ts`

- [ ] **Step 1: Write the types**

Create `src/types/legendary.ts`:

```ts
/** One legendary dweller roster entry (generated into public/atlas/legendaries.json). */
export interface LegendaryMeta {
  /** Save identity, e.g. "L_Jericho" — written to the dweller's `uniqueData`. */
  uniqueData: string;
  name: string;
  lastName: string;
  /** Save encoding: 1 = female, 2 = male. */
  gender: number;
  /** [S, P, E, C, I, A, L]. */
  special: number[];
  outfitId: string;
  /** May be empty — the game assigns a default weapon. */
  weaponId: string;
  /** ARGB uint32. */
  skinColor: number;
  /** ARGB uint32. */
  hairColor: number;
  /** Hair piece name, or null when the character uses none. */
  hair: string | null;
  /** Facemask piece name (beard/wrinkles/etc.), or null. */
  faceMask: string | null;
}

export interface LegendaryIndex {
  version: number;
  legendaries: LegendaryMeta[];
}
```

- [ ] **Step 2: Write the loader**

Create `src/lib/legendaryIndex.ts` (mirrors `src/lib/petIndex.ts`):

```ts
import type { LegendaryIndex } from '../types/legendary';

let cached: LegendaryIndex | null = null;
let pending: Promise<LegendaryIndex> | null = null;

/** Reset module-level cache (for tests only). */
export function _resetLegendaryCache(): void { cached = null; pending = null; }

export async function loadLegendaryIndex(): Promise<LegendaryIndex> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch('/atlas/legendaries.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load legendary index: ${r.status}`);
      return r.json() as Promise<LegendaryIndex>;
    })
    .then((idx) => { cached = idx; return idx; })
    .finally(() => { pending = null; });
  return pending;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/legendary.ts src/lib/legendaryIndex.ts
git commit -m "feat(legendary): roster types and runtime loader"
```

---

## Task 4: Add rarity/uniqueData to the Dweller type

**Files:**
- Modify: `src/types/save.ts:23-34`

- [ ] **Step 1: Add the fields**

In `src/types/save.ts`, inside `export interface Dweller`, add after `hair?: string;`:

```ts
  rarity?: string;
  uniqueData?: string;
```

(The `[k: string]: unknown` index signature already permits these at runtime; this makes them first-class for the new code.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/save.ts
git commit -m "feat(legendary): add rarity/uniqueData to Dweller type"
```

---

## Task 5: createLegendaryDweller

**Files:**
- Modify: `src/lib/dwellerEdit.ts`
- Test: `src/lib/dwellerEdit.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/dwellerEdit.test.ts`:

```ts
import { createLegendaryDweller, LEGENDARY_MIN_LEVEL, LEGENDARY_MAX_LEVEL } from './dwellerEdit';
import type { LegendaryMeta } from '../types/legendary';

const JERICHO: LegendaryMeta = {
  uniqueData: 'L_Jericho', name: 'Jericho', lastName: '', gender: 2,
  special: [8, 6, 8, 2, 3, 7, 6], outfitId: 'WandererArmor_Heavy',
  weaponId: 'AssaultRifle_Infiltrator', skinColor: 0xffe9d4b4, hairColor: 0xff695949,
  hair: null, faceMask: 'f_hair_11',
};
const MOIRA: LegendaryMeta = {
  uniqueData: 'L_Moira Brown', name: 'Moira', lastName: 'Brown', gender: 1,
  special: [1, 2, 3, 4, 5, 6, 7], outfitId: 'HandymanJumpsuit_Expert',
  weaponId: '', skinColor: 0xffffffff, hairColor: 0xff000000, hair: '22', faceMask: null,
};

describe('createLegendaryDweller', () => {
  it('writes rarity, uniqueData, name, gender, outfit and faceMask', () => {
    const d = createLegendaryDweller(JERICHO, [], 30) as any;
    expect(d.rarity).toBe('Legendary');
    expect(d.uniqueData).toBe('L_Jericho');
    expect(d.name).toBe('Jericho');
    expect(d.gender).toBe(2);
    expect(d.equipedOutfit.id).toBe('WandererArmor_Heavy');
    expect(d.equipedWeapon.id).toBe('AssaultRifle_Infiltrator');
    expect(d.faceMask).toBe('f_hair_11');
  });

  it('maps SPECIAL into the 8-slot stats array (slot 0 is a placeholder)', () => {
    const d = createLegendaryDweller(JERICHO, [], 30) as any;
    expect(d.stats.stats).toHaveLength(8);
    expect(d.stats.stats.slice(1).map((s: any) => s.value)).toEqual([8, 6, 8, 2, 3, 7, 6]);
  });

  it('sets the requested level and matching health (105 + (level-1)*6)', () => {
    const d = createLegendaryDweller(JERICHO, [], 31) as any;
    expect(d.experience.currentLevel).toBe(31);
    expect(d.health.maxHealth).toBe(285);
    expect(d.health.healthValue).toBe(285);
  });

  it('falls back to Fist when the roster weapon is empty', () => {
    const d = createLegendaryDweller(MOIRA, [], 20) as any;
    expect(d.equipedWeapon.id).toBe('Fist');
  });

  it('omits hair when the roster entry has none, sets it otherwise', () => {
    expect((createLegendaryDweller(JERICHO, [], 20) as any).hair).toBeUndefined();
    expect((createLegendaryDweller(MOIRA, [], 20) as any).hair).toBe('22');
  });

  it('picks the smallest free serializeId', () => {
    expect((createLegendaryDweller(JERICHO, [1, 2, 4], 20) as any).serializeId).toBe(3);
  });

  it('defaults to a random level within [MIN, MAX] when none is given', () => {
    const lvl = (createLegendaryDweller(JERICHO, []) as any).experience.currentLevel;
    expect(lvl).toBeGreaterThanOrEqual(LEGENDARY_MIN_LEVEL);
    expect(lvl).toBeLessThanOrEqual(LEGENDARY_MAX_LEVEL);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: FAIL — `createLegendaryDweller` not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/dwellerEdit.ts`. First the import at the top (next to the existing type imports):

```ts
import type { LegendaryMeta } from '../types/legendary';
```

Then append at the end of the file:

```ts
/** Game's legendary lunchbox level range (GameParameters m_legendaryDwellerInitialLevel). */
export const LEGENDARY_MIN_LEVEL = 20;
export const LEGENDARY_MAX_LEVEL = 45;

const randomLegendaryLevel = () =>
  LEGENDARY_MIN_LEVEL + Math.floor(Math.random() * (LEGENDARY_MAX_LEVEL - LEGENDARY_MIN_LEVEL + 1));

/**
 * Build a save-shaped legendary dweller from a roster entry, positioned at the
 * vault door (`savedRoom: -1`, `assigned: false`) like a fresh arrival. Level
 * defaults to a random value in [LEGENDARY_MIN_LEVEL, LEGENDARY_MAX_LEVEL]
 * (matching the game's lunchbox behavior); pass `level` to force one (tests).
 * Health mirrors the game's observed `105 + (level-1)*6`; the game recomputes it
 * on the next level-up regardless. SPECIAL base values come from the roster with
 * mod 0 (equipment mods are recalculated by the game on load).
 */
export function createLegendaryDweller(
  entry: LegendaryMeta,
  existingIds: number[],
  level?: number,
): Dweller {
  let id = 1;
  const used = new Set(existingIds);
  while (used.has(id)) id += 1;

  const lvl = clampLevel(level ?? randomLegendaryLevel());
  const maxHealth = 105 + (lvl - 1) * 6;

  const stats = [
    { value: 1, mod: 0, exp: 0 }, // slot 0 placeholder (mirrors createDwellerAtDoor)
    ...entry.special.map((value) => ({ value, mod: 0, exp: 0 })),
  ];

  const d: Record<string, unknown> = {
    serializeId: id,
    name: entry.name || 'Legendary',
    lastName: entry.lastName,
    happiness: { happinessValue: 75 },
    health: { healthValue: maxHealth, radiationValue: 0, permaDeath: false, lastLevelUpdated: lvl, maxHealth },
    deathSource: 0,
    experience: { experienceValue: 0, currentLevel: lvl, storage: 0, accum: 0, needLvUp: false, wastelandExperience: 0 },
    relations: { relations: [], partner: -1, lastPartner: -1, ascendants: [-1, -1, -1, -1, -1, -1] },
    gender: entry.gender === 2 ? 2 : 1,
    stats: { stats },
    pregnant: false,
    babyReady: false,
    assigned: false,
    sawIncident: false,
    WillGoToWasteland: false,
    WillBeEvicted: false,
    IsEvictedWaitingForFollowers: false,
    skinColor: entry.skinColor,
    hairColor: entry.hairColor,
    outfitColor: 4294967295,
    pendingExperienceReward: 0,
    uniqueData: entry.uniqueData,
    faceMask: entry.faceMask,
    equipedOutfit: { id: entry.outfitId, type: 'Outfit', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    equipedWeapon: { id: entry.weaponId || 'Fist', type: 'Weapon', hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false },
    savedRoom: -1,
    wasTemporarilyAssigned: false,
    lastChildBorn: -1,
    rarity: 'Legendary',
    deathTime: -1,
  };
  if (entry.hair) d.hair = entry.hair;

  return d as unknown as Dweller;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dwellerEdit.test.ts`
Expected: PASS (all new tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dwellerEdit.ts src/lib/dwellerEdit.test.ts
git commit -m "feat(legendary): createLegendaryDweller from roster entry"
```

---

## Task 6: Store action addLegendaryDweller

**Files:**
- Modify: `src/store/saveStore.ts`
- Test: `src/store/saveStore.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/store/saveStore.test.ts` (match the file's existing import/setup style; if it has a helper to seed a save, reuse it — otherwise build a minimal save as below):

```ts
import { useSaveStore } from './saveStore';
import type { LegendaryMeta } from '../types/legendary';

const ENTRY: LegendaryMeta = {
  uniqueData: 'L_Jericho', name: 'Jericho', lastName: '', gender: 2,
  special: [8, 6, 8, 2, 3, 7, 6], outfitId: 'WandererArmor_Heavy',
  weaponId: 'AssaultRifle_Infiltrator', skinColor: 0xffe9d4b4, hairColor: 0xff695949,
  hair: null, faceMask: 'f_hair_11',
};

function seedSave() {
  useSaveStore.setState({
    save: { dwellers: { dwellers: [{ serializeId: 1 } as any] } } as any,
    selectedDwellerId: 1,
  });
}

describe('addLegendaryDweller', () => {
  it('appends a legendary, selects it, and switches to the dweller page', () => {
    seedSave();
    const id = useSaveStore.getState().addLegendaryDweller(ENTRY);
    const s = useSaveStore.getState();
    const added = s.save!.dwellers.dwellers.find((d) => d.serializeId === id) as any;
    expect(added.rarity).toBe('Legendary');
    expect(added.uniqueData).toBe('L_Jericho');
    expect(s.selectedDwellerId).toBe(id);
    expect(s.page).toBe('dweller');
  });

  it('returns null when there is no save', () => {
    useSaveStore.setState({ save: null, selectedDwellerId: null });
    expect(useSaveStore.getState().addLegendaryDweller(ENTRY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/saveStore.test.ts`
Expected: FAIL — `addLegendaryDweller` is not a function.

- [ ] **Step 3: Implement**

In `src/store/saveStore.ts`:

1. Extend the import from `dwellerEdit` to include `createLegendaryDweller` (find the existing `import { createDwellerAtDoor, ... } from '../lib/dwellerEdit'` and add `createLegendaryDweller`).
2. Add the import: `import type { LegendaryMeta } from '../types/legendary';`
3. In the `SaveState` interface, after the `addDweller` declaration (line ~23), add:

```ts
  /** Add a legendary dweller from a roster entry; returns the new id (or null if no save). */
  addLegendaryDweller: (entry: LegendaryMeta) => number | null;
```

4. In the store object, right after the `addDweller` implementation, add:

```ts
  addLegendaryDweller: (entry) => {
    const { save } = get();
    if (!save) return null;
    const existing = save.dwellers.dwellers;
    const dweller = createLegendaryDweller(entry, existing.map((d) => d.serializeId));
    set({
      save: { ...save, dwellers: { ...save.dwellers, dwellers: [...existing, dweller] } },
      selectedDwellerId: dweller.serializeId,
      page: 'dweller',
    });
    return dweller.serializeId;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/saveStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/saveStore.ts src/store/saveStore.test.ts
git commit -m "feat(legendary): addLegendaryDweller store action"
```

---

## Task 7: Legendary catalog modal

**Files:**
- Create: `src/components/LegendaryCatalogModal.tsx`

- [ ] **Step 1: Implement the modal**

Create `src/components/LegendaryCatalogModal.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadLegendaryIndex } from '../lib/legendaryIndex';
import { useDwellerThumbnail } from '../lib/useDwellerThumbnail';
import { decodeArgb } from '../lib/colors';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { LegendaryMeta } from '../types/legendary';

function toRenderable(e: LegendaryMeta): RenderableDweller {
  return {
    gender: e.gender,
    hairName: e.hair ?? undefined,
    facialHair: e.faceMask ?? undefined,
    outfitName: e.outfitId,
    happinessValue: 75,
    skinColor: decodeArgb(e.skinColor),
    hairColor: decodeArgb(e.hairColor),
    outfitColor: decodeArgb(0xffffffff),
  };
}

function LegendaryCard({ entry, selected, onSelect }: {
  entry: LegendaryMeta; selected: boolean; onSelect: () => void;
}) {
  const renderable = useMemo(() => toRenderable(entry), [entry]);
  const thumb = useDwellerThumbnail(renderable);
  const fullName = [entry.name, entry.lastName].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      onClick={onSelect}
      title={fullName}
      className={`flex flex-col items-center rounded p-1 transition-all ${
        selected ? 'ring-2 ring-green-400 bg-green-950/40' : 'hover:bg-zinc-800'
      }`}
    >
      <div className="w-[120px] bg-zinc-900/60 rounded" style={{ aspectRatio: '170 / 221' }}>
        {thumb && <img src={thumb} alt={fullName} className="w-full h-full object-contain" />}
      </div>
      <div className="text-xs text-zinc-200 mt-1 text-center leading-tight">{fullName}</div>
    </button>
  );
}

export function LegendaryCatalogModal({ onAdd, onClose }: {
  onAdd: (entry: LegendaryMeta) => void; onClose: () => void;
}) {
  const [list, setList] = useState<LegendaryMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LegendaryMeta | null>(null);

  useEffect(() => {
    loadLegendaryIndex().then((idx) => setList(idx.legendaries)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex flex-col w-[min(900px,90vw)] h-[min(700px,85vh)] bg-zinc-900 rounded-lg shadow-xl border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-700 text-zinc-100 font-medium">Add Legendary Dweller</div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {error && <div className="text-red-400 text-sm">Could not load legendaries: {error}</div>}
          {!list && !error && <div className="text-zinc-400 text-sm">Loading…</div>}
          {list && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}>
              {list.map((e) => (
                <LegendaryCard
                  key={e.uniqueData}
                  entry={e}
                  selected={selected?.uniqueData === e.uniqueData}
                  onSelect={() => setSelected(e)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button type="button" onClick={onClose}
            className="px-3 h-8 rounded text-sm bg-zinc-700 hover:bg-zinc-600 text-white">Cancel</button>
          <button type="button" disabled={!selected}
            onClick={() => selected && onAdd(selected)}
            className="px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white">
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

> Note: rendering ~57 avatars at once is acceptable for v1 because `renderDwellerThumbnail` reuses a single shared offscreen renderer and `useDwellerThumbnail` caches by appearance key. If it proves slow in the manual check (Task 8), add `IntersectionObserver`-gated rendering to `LegendaryCard` — out of scope unless observed.

- [ ] **Step 3: Commit**

```bash
git add src/components/LegendaryCatalogModal.tsx
git commit -m "feat(legendary): catalog modal with avatar grid and Add button"
```

---

## Task 8: Split the Add Dweller control into Custom + Legendary

**Files:**
- Modify: `src/components/DwellerEditor.tsx:80-89` (the add button) and the imports/state.

- [ ] **Step 1: Wire the modal and two buttons**

In `src/components/DwellerEditor.tsx`:

1. Add to the React import so `useState` is available (it already imports `useState`/`useEffect` — confirm; no change if present).
2. Add imports:

```tsx
import { LegendaryCatalogModal } from './LegendaryCatalogModal';
```

3. Inside the component, add store access + modal state (near the other hooks, after `const addDweller = useSaveStore((s) => s.addDweller);`):

```tsx
  const addLegendary = useSaveStore((s) => s.addLegendaryDweller);
  const [showLegendary, setShowLegendary] = useState(false);
```

4. Replace the single button block (`src/components/DwellerEditor.tsx:80-89`) with two buttons:

```tsx
          <button
            type="button"
            aria-label="Add a new custom dweller"
            title="Add a new custom dweller"
            onClick={() => addDweller(randomDwellerInput())}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            Custom
          </button>
          <button
            type="button"
            aria-label="Add a legendary dweller"
            title="Add a legendary dweller"
            onClick={() => setShowLegendary(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded text-sm font-medium bg-amber-500 hover:bg-amber-400 text-black whitespace-nowrap"
          >
            <span aria-hidden="true">★</span>
            Legendary
          </button>
```

5. Mount the modal. At the end of the component's returned JSX (just before the outermost closing tag), add:

```tsx
      {showLegendary && (
        <LegendaryCatalogModal
          onAdd={(entry) => { addLegendary(entry); setShowLegendary(false); }}
          onClose={() => setShowLegendary(false)}
        />
      )}
```

- [ ] **Step 2: Typecheck and run the full suite**

Run: `npx tsc -b && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 3: Manual verification (dev server)**

Run the app, open a save, click **Legendary**, confirm the catalog shows avatars, select one (e.g. Jericho), click **Add**. Confirm a new legendary dweller is selected in the editor with the right name/outfit. Then export the save, load it in Fallout Shelter, and confirm the dweller appears as a legendary (gold frame, correct name/SPECIAL/outfit) at a level in [20, 45].

- [ ] **Step 4: Commit**

```bash
git add src/components/DwellerEditor.tsx
git commit -m "feat(legendary): split Add Dweller into Custom + Legendary catalog"
```

---

## Self-review notes (addressed)

- **Spec coverage:** build extraction (Tasks 1–2), types/loader (Task 3), save type (Task 4), `createLegendaryDweller` with level 20–45 (Task 5), store action (Task 6), modal catalog with avatars + bottom-right Add (Task 7), Custom/Legendary split (Task 8). All spec sections mapped.
- **Type consistency:** `LegendaryMeta` fields are identical across the parser output (Task 1), JSON (Task 2), type (Task 3), `createLegendaryDweller` (Task 5), store (Task 6), and modal (Task 7). `addLegendaryDweller` signature matches between interface and call sites.
- **Gender encoding:** asset `m_gender` is inverted exactly once, in the parser (Task 1); every downstream consumer uses the already-save-encoded value.
- **No placeholders:** every code step contains full code; commands have expected output.
