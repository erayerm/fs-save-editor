// Build the runtime sprite index for dweller customization pieces.
// Reads from the AssetRipper "Export Unity Project" output and writes to public/atlas/.
//
// Usage:  node scripts/build-sprite-index.mjs
import {
  readFileSync, readdirSync, writeFileSync, mkdirSync, statSync, copyFileSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import { parseHeadgearPlacement } from './lib/parseHeadgear.mjs';
import { parseLocalization } from './lib/localization.mjs';
import { decodeIndexBuffer, decodeVertexStreams, decodeVertexChannels } from './lib/decodeMesh.mjs';
import { WEAPON_DATA } from './lib/weaponData.mjs';
import { PET_DATA } from './lib/petData.mjs';
import { parseNguiAtlas, pngSize } from './lib/parseNguiAtlas.mjs';
import { resolveWeaponSprite } from './lib/weaponSprite.mjs';

const ROOT = 'TEMPORARY-game-files/export-3/ExportedProject/Assets';
const SCRIPTS_DIR = join(ROOT, 'Scripts/Assembly-CSharp');
const MB_DIR = join(ROOT, 'MonoBehaviour');
const ATLAS_DIR = join(ROOT, 'Resources/dwelleratlases');
const UI_ATLAS_DIR = join(ROOT, 'Resources/atlas');
const OUT_DIR = 'public/atlas';
mkdirSync(OUT_DIR, { recursive: true });

// Script class name -> our PieceType.
const SCRIPT_TO_TYPE = {
  DwellerBody: 'body',
  DwellerOutfit: 'outfit',
  DwellerOutfitColoringMask: 'outfitColoringMask',
  DwellerFace: 'face',
  DwellerFaceMask: 'faceMask',
  DwellerHair: 'hair',
  DwellerHelmet: 'helmet',
  DwellerHelmetMask: 'helmetMask',
  DwellerLargeHeadgear: 'largeHeadgear',
  DwellerHandPose: 'handPose',
  DwellerGlovePose: 'glovePose',
};

// 1. Script GUID -> our PieceType.
const scriptGuidToType = new Map();
for (const className of Object.keys(SCRIPT_TO_TYPE)) {
  const metaPath = join(SCRIPTS_DIR, `${className}.cs.meta`);
  try {
    const guid = readFileSync(metaPath, 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
    if (guid) scriptGuidToType.set(guid, SCRIPT_TO_TYPE[className]);
  } catch {
    // Some script .meta files are missing in the export; that's fine — we'll skip those types.
  }
}

// 2. Atlas Texture2D GUID -> { filename, srcPath }
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const atlasGuidToFile = new Map();
for (const p of walk(ATLAS_DIR)) {
  if (!p.endsWith('.png.meta')) continue;
  const guid = readFileSync(p, 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
  if (!guid) continue;
  const png = p.replace(/\.meta$/, '');
  atlasGuidToFile.set(guid, { srcPath: png, filename: basename(png) });
}

// 3. Parse pieces.
function parsePiece(text) {
  const grab = (re) => text.match(re)?.[1];
  const scriptGuid = grab(/m_Script:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
  if (!scriptGuid) return null;
  const type = scriptGuidToType.get(scriptGuid);
  if (!type) return null;

  const m_Name = grab(/^\s*m_Name:\s*(.+?)\s*$/m);
  const m_guid = grab(/^\s*m_guid:\s*([0-9a-f]+)/m);
  const m_atlasGuid = grab(/m_atlas:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
  if (!m_guid || !m_atlasGuid) return null;

  const xy = text.match(/m_atlasBounds:[\s\S]*?x:\s*(-?\d+)\s*\n\s*y:\s*(-?\d+)/);
  const wh = text.match(/m_atlasBounds:[\s\S]*?width:\s*(-?\d+)\s*\n\s*height:\s*(-?\d+)/);
  if (!xy || !wh) return null;
  const bounds = { x: +xy[1], y: +xy[2], w: +wh[1], h: +wh[2] };

  const origPath = grab(/^\s*m_originalFilePath:\s*(.+?)\s*$/m) ?? '';
  let gender = 'any';
  if (/\/Female\//i.test(origPath)) gender = 'female';
  else if (/\/Male\//i.test(origPath)) gender = 'male';

  const flag = (re) => {
    const m = grab(re);
    return m == null ? undefined : !!+m;
  };
  const intFlag = (re) => {
    const m = grab(re);
    return m == null ? undefined : +m;
  };
  const flags = {
    isBald: flag(/^\s*m_isBald:\s*(\d)/m),
    type: intFlag(/^\s*m_type:\s*(\d)/m),
    hasSkirt: flag(/^\s*m_hasSkirt:\s*(\d)/m),
    isUsedByDefault: flag(/^\s*m_isUsedByDwellerDefaultSpawnCycle:\s*(\d)/m),
  };
  for (const k of Object.keys(flags)) if (flags[k] === undefined) delete flags[k];

  // Parse m_colors[] (rgba in 0..1)
  const colorsBlock = text.match(/m_colors:\s*([\s\S]*?)(?=^\s*m_\w+:|\Z)/m)?.[1] ?? '';
  const colorMatches = [...colorsBlock.matchAll(
    /-\s*\{r:\s*([0-9.eE+-]+),\s*g:\s*([0-9.eE+-]+),\s*b:\s*([0-9.eE+-]+),\s*a:\s*([0-9.eE+-]+)\}/g
  )];
  const colors = colorMatches.length
    ? colorMatches.map((m) => [+m[1], +m[2], +m[3], +m[4]])
    : undefined;

  let headgearPlacement, maleMeshMetaGuid, femaleMeshMetaGuid;
  if (type === 'largeHeadgear') {
    headgearPlacement = parseHeadgearPlacement(text);
    maleMeshMetaGuid = grab(/m_maleMesh:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
    femaleMeshMetaGuid = grab(/m_femaleMesh:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
  }

  // Outfit: capture helmet, largeHeadgear, coloring mask, and glove pose meta-GUIDs.
  let helmetMetaGuid, largeHeadgearMetaGuid, coloringMaskMetaGuid, glovePoseMetaGuids;
  if (type === 'outfit') {
    helmetMetaGuid = grab(/m_helmet:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
    largeHeadgearMetaGuid = grab(/m_largeHeadgear:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
    coloringMaskMetaGuid = grab(/m_coloringMask:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
    const glovePoseBlock = text.match(/m_glovePoses:([\s\S]*?)(?=\n\s*m_[a-zA-Z])/m)?.[1] ?? '';
    glovePoseMetaGuids = [...glovePoseBlock.matchAll(/guid:\s*([0-9a-f]+)/g)].map(m => m[1]);
  }

  // Helmet / largeHeadgear: capture mask ref and isExclusive flag.
  let maskMetaGuid;
  if (type === 'helmet' || type === 'largeHeadgear') {
    maskMetaGuid = grab(/m_mask:\s*\{[^}]*guid:\s*([0-9a-f]+)/);
    const excl = flag(/^\s*m_isExclusive:\s*(\d)/m);
    if (excl !== undefined) flags.isExclusive = excl;
  }

  return { type, m_Name, m_guid, m_atlasGuid, bounds, gender, flags, colors,
    headgearPlacement, maleMeshMetaGuid, femaleMeshMetaGuid,
    helmetMetaGuid, largeHeadgearMetaGuid, coloringMaskMetaGuid, glovePoseMetaGuids, maskMetaGuid };
}

const referencedAtlases = new Set();
const byType = {
  body: [], outfit: [], outfitColoringMask: [], face: [], faceMask: [],
  hair: [], helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
};

// assetMetaGuid → m_guid map (built during parse loop for cross-reference resolution).
const assetMetaGuidToMGuid = new Map();
// assetMetaGuid → outfit ref. Unlike m_guid (which collides across assets — e.g.
// BattleArmor and EngineerFemaleSpecial share one m_guid), the .meta guid is unique
// per asset file, so this maps a DwellerOutfitItem's outfit reference to the exact ref.
const outfitMetaGuidToRef = new Map();
// Pending cross-references to resolve after all pieces are parsed.
const pendingRefs = [];

const files = readdirSync(MB_DIR).filter((f) => f.endsWith('.asset')).sort();
for (const f of files) {
  // Build meta GUID → m_guid map on the fly (read .meta sidecar).
  const metaPath = join(MB_DIR, f + '.meta');
  let fileMetaGuid;
  try {
    const metaGuid = readFileSync(metaPath, 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
    if (metaGuid) {
      fileMetaGuid = metaGuid;
      const t2 = readFileSync(join(MB_DIR, f), 'utf8');
      const mGuid = t2.match(/^\s*m_guid:\s*([0-9a-f]+)/m)?.[1];
      if (mGuid) assetMetaGuidToMGuid.set(metaGuid, mGuid);
    }
  } catch { /* meta file missing — skip */ }

  const text = readFileSync(join(MB_DIR, f), 'utf8');
  if (!/m_atlasBounds/.test(text)) continue;
  const p = parsePiece(text);
  if (!p) continue;
  const atlasInfo = atlasGuidToFile.get(p.m_atlasGuid);
  if (!atlasInfo) continue;
  referencedAtlases.add(atlasInfo.filename);
  const ref = {
    guid: p.m_guid,
    name: p.m_Name,
    atlas: atlasInfo.filename,
    bounds: p.bounds,
    gender: p.gender,
    flags: p.flags,
    ...(p.colors ? { colors: p.colors } : {}),
  };
  if (p.type === 'largeHeadgear') {
    if (p.headgearPlacement) ref.headgear = p.headgearPlacement;
    if (p.maleMeshMetaGuid) ref._maleMeshMetaGuid = p.maleMeshMetaGuid;
    if (p.femaleMeshMetaGuid) ref._femaleMeshMetaGuid = p.femaleMeshMetaGuid;
  }
  byType[p.type].push(ref);
  if (p.type === 'outfit' && fileMetaGuid) outfitMetaGuidToRef.set(fileMetaGuid, ref);

  // Queue cross-ref resolution for outfits and helmets.
  if (p.type === 'outfit') {
    pendingRefs.push({
      ref,
      helmetMetaGuid: p.helmetMetaGuid,
      largeHeadgearMetaGuid: p.largeHeadgearMetaGuid,
      coloringMaskMetaGuid: p.coloringMaskMetaGuid,
      glovePoseMetaGuids: p.glovePoseMetaGuids ?? [],
    });
  }
  if ((p.type === 'helmet' || p.type === 'largeHeadgear') && p.maskMetaGuid) {
    pendingRefs.push({ ref, maskMetaGuid: p.maskMetaGuid });
  }
}

// Resolve meta-GUIDs → m_GUIDs for all cross-references.
for (const { ref, helmetMetaGuid, largeHeadgearMetaGuid, coloringMaskMetaGuid, glovePoseMetaGuids, maskMetaGuid } of pendingRefs) {
  if (helmetMetaGuid) {
    const g = assetMetaGuidToMGuid.get(helmetMetaGuid);
    if (g) ref.helmetGuid = g;
  }
  if (largeHeadgearMetaGuid) {
    const g = assetMetaGuidToMGuid.get(largeHeadgearMetaGuid);
    if (g) ref.largeHeadgearGuid = g;
  }
  if (coloringMaskMetaGuid) {
    const g = assetMetaGuidToMGuid.get(coloringMaskMetaGuid);
    if (g) ref.coloringMaskGuid = g;
  }
  if (glovePoseMetaGuids?.length > 0) {
    const resolved = glovePoseMetaGuids.map(g => assetMetaGuidToMGuid.get(g)).filter(Boolean);
    if (resolved.length > 0) ref.glovePoseGuids = resolved;
  }
  if (maskMetaGuid) {
    const g = assetMetaGuidToMGuid.get(maskMetaGuid);
    if (g) ref.maskGuid = g;
  }
}

// ---------------------------------------------------------------------------
// Tag each visual outfit with its DwellerOutfitItem category.
//
// DwellerOutfit assets (parsed above) are purely visual — they carry no item
// data. The real item definitions live in GameParameters.prefab as a list of
// DwellerOutfitItem entries, each of which references its male/female visual
// outfit by .meta GUID and declares an EOutfitCategory. We use that category to
// distinguish real player items (Premium=2) from enemy/scripted outfits
// (CodeControlled=4, e.g. Scorched, Gen1Synth, alien_space_suit_enemy).
// ---------------------------------------------------------------------------
// outfitItems: every DwellerOutfitItem keyed by its m_outfitId (the string stored
// in saves as equipedOutfit.id). This is the AUTHORITATIVE outfit list — using any
// other id (e.g. the visual piece name) makes the game replace the outfit with the
// default jumpsuit on load. Each item also records the resolved visual piece NAME
// per gender so the renderer can draw the right art (multiple items, e.g.
// HandymanJumpsuit / _Advanced / _Expert, share one visual but differ in SPECIAL).
const outfitItems = [];
{
  const gpPath = join(ROOT, 'GameObject/GameParameters.prefab');
  let tagged = 0;
  try {
    const gp = readFileSync(gpPath, 'utf8');
    let locMap = new Map();
    try { locMap = parseLocalization(readFileSync(join(ROOT, 'Resources/I2Languages.prefab'), 'utf8')); } catch { /* names optional */ }

    // male, female, outfitId, category, specialStats, nameLoc, hasHelmet appear
    // consecutively in each entry. The male/female refs are .meta guids.
    const itemRe = /m_maleOutfit:\s*\{([^}]*)\}\s*\n\s*m_femaleOutfit:\s*\{([^}]*)\}\s*\n\s*m_outfitId:\s*(\S+)\s*\n\s*m_category:\s*(-?\d+)\s*\n\s*m_specialStats:\s*([\s\S]*?)m_outfitNameLocalizationId:\s*(\S+)\s*\n\s*m_HasHelmet:\s*(\d+)/g;
    const guidOf = (brace) => brace.match(/guid:\s*([0-9a-f]+)/)?.[1];
    // Parse the m_specialStats block into a { S, P, E, C, I, A, L } map of non-zero bonuses.
    const STAT_LETTERS = [
      ['Strength', 'S'], ['Perception', 'P'], ['Endurance', 'E'], ['Charisma', 'C'],
      ['Intelligence', 'I'], ['Agility', 'A'], ['Luck', 'L'],
    ];
    const parseSpecial = (block) => {
      const out = {};
      for (const [field, letter] of STAT_LETTERS) {
        const v = block.match(new RegExp(`${field}:\\s*\\n\\s*Value:\\s*(-?\\d+)`))?.[1];
        if (v != null && +v > 0) out[letter] = +v;
      }
      return out;
    };
    let m;
    while ((m = itemRe.exec(gp)) !== null) {
      const maleGuid = guidOf(m[1]);
      const femaleGuid = guidOf(m[2]);
      const id = m[3];
      const category = +m[4];
      const special = parseSpecial(m[5]);
      const name = locMap.get(m[6]) || id;
      const hasHelmet = +m[7] === 1;
      const maleRef = maleGuid ? outfitMetaGuidToRef.get(maleGuid) : null;
      const femaleRef = femaleGuid ? outfitMetaGuidToRef.get(femaleGuid) : null;

      outfitItems.push({
        id, name, category,
        ...(Object.keys(special).length ? { special } : {}),
        pieceMale: maleRef?.name ?? null,
        pieceFemale: femaleRef?.name ?? null,
        ...(hasHelmet ? { hasHelmet: true } : {}),
      });

      // Also tag the visual pieces with category/special (kept for backward compat
      // with any piece-level consumers). Premium wins when a visual is shared.
      const hasSpecial = Object.keys(special).length > 0;
      for (const ref of [maleRef, femaleRef]) {
        if (!ref) continue;
        if (ref.flags.outfitCategory === 2) continue;
        ref.flags.outfitCategory = category;
        if (hasSpecial) ref.special = special;
        else delete ref.special;
        tagged++;
      }
    }
    console.log(`Parsed ${outfitItems.length} outfit items (${tagged} visuals tagged)`);
  } catch (e) {
    console.warn(`Warning: could not parse outfit items from ${gpPath}: ${e.message}`);
  }
}

// Sort each type by name for deterministic output.
// Note: dwellers reference pieces by NAME (see Pre-flight findings), so the same
// name may appear twice within a type (one per gender) — that's expected. Runtime
// lookup disambiguates by gender. We do not build a name→index map here.
for (const t of Object.keys(byType)) {
  byType[t].sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
}

// Resolve largeHeadgear mesh GUIDs and decode mesh geometry.
const MESH_DIR = join(ROOT, 'Mesh');
const meshMetaGuidToPath = new Map();
for (const f of walk(MESH_DIR)) {
  if (!f.endsWith('.asset.meta')) continue;
  const guid = readFileSync(f, 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
  if (guid) meshMetaGuidToPath.set(guid, f.replace(/\.meta$/, ''));
}

// Parse the ordered m_Channels list (stream/offset/format/dimension) from a mesh asset.
function parseVertexChannels(text) {
  const block = text.match(/m_Channels:([\s\S]*?)m_DataSize:/);
  if (!block) return [];
  const re = /-\s*stream:\s*(\d+)\s*\n\s*offset:\s*(\d+)\s*\n\s*format:\s*(\d+)\s*\n\s*dimension:\s*(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(block[1]))) {
    out.push({ stream: +m[1], offset: +m[2], format: +m[3], dimension: +m[4] });
  }
  return out;
}

function decodeMeshAsset(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const vertexCount = +text.match(/m_VertexCount:\s*(\d+)/)[1];
    // A mesh may have multiple submeshes (e.g. largeHeadgear bundles a large
    // "blocker" submesh with the actual hat quad as the LAST submesh). The first
    // `indexCount:` field belongs to submesh 0, not the whole buffer, so we sum
    // every submesh's indexCount to decode the FULL index buffer and record the
    // per-submesh counts so the renderer can isolate the hat quad.
    const indexCounts = [...text.matchAll(/\bindexCount:\s*(\d+)/g)].map((m) => +m[1]);
    const totalIndices = indexCounts.reduce((a, b) => a + b, 0);
    const indexHex = text.match(/m_IndexBuffer:\s*([0-9a-f]+)/)[1];
    const vertHex = text.match(/_typelessdata:\s*([0-9a-f]+)/)[1];
    const indices = decodeIndexBuffer(indexHex, totalIndices);
    // largeHeadgear meshes use a different stream layout than the dweller body mesh
    // (stream1 = UV0 only, 8B). Parse m_Channels and decode channel-aware.
    const channels = parseVertexChannels(text);
    const { positions, uvs, uvs1 } = decodeVertexChannels(vertHex, vertexCount, channels);
    return { positions, uvs, uvs1, indices, ...(indexCounts.length > 1 ? { indexCounts } : {}) };
  } catch (e) {
    console.warn(`Warning: failed to decode mesh asset ${path}: ${e.message}`);
    return null;
  }
}

const largeHeadgearMeshes = {};
for (const ref of byType.largeHeadgear) {
  const malePath = ref._maleMeshMetaGuid ? meshMetaGuidToPath.get(ref._maleMeshMetaGuid) : null;
  const femalePath = ref._femaleMeshMetaGuid ? meshMetaGuidToPath.get(ref._femaleMeshMetaGuid) : null;
  const male = malePath ? decodeMeshAsset(malePath) : null;
  const female = femalePath ? decodeMeshAsset(femalePath) : null;
  if (male || female) {
    largeHeadgearMeshes[ref.guid] = { male, female };
  }
  delete ref._maleMeshMetaGuid;
  delete ref._femaleMeshMetaGuid;
}

// Update meshes.json with largeHeadgear key.
const meshesPath = join(OUT_DIR, 'meshes.json');
let meshesOutput = {};
try { meshesOutput = JSON.parse(readFileSync(meshesPath, 'utf8')); } catch { /* first run */ }
meshesOutput.largeHeadgear = largeHeadgearMeshes;
writeFileSync(meshesPath, JSON.stringify(meshesOutput));

// Copy only referenced atlas PNGs.
const filenameToEntry = new Map();
for (const entry of atlasGuidToFile.values()) filenameToEntry.set(entry.filename, entry);

for (const filename of referencedAtlases) {
  const entry = filenameToEntry.get(filename);
  if (!entry) { console.warn(`Atlas ${filename} referenced but not found — skipping`); continue; }
  copyFileSync(entry.srcPath, join(OUT_DIR, filename));
}

outfitItems.sort((a, b) => a.id.localeCompare(b.id));
const index = { version: 1, byType, outfitItems };
writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

// ---------------------------------------------------------------------------
// UI sprite-atlas icons (weapons + SPECIAL stats), sourced from NGUI prefabs.
// These are CSS-cropped at runtime from the copied atlas PNGs, so each icon is
// { atlas, x, y, w, h } plus the atlas dimensions (aw, ah) for background-size.
// ---------------------------------------------------------------------------

// Weapon icons from Weapons_HD atlas.
const WEAPONS_ATLAS_PNG = 'Weapons_HD.png';
const weaponSprites = parseNguiAtlas(join(UI_ATLAS_DIR, 'Weapons_HD.prefab'));
const weaponsAtlasSize = pngSize(join(UI_ATLAS_DIR, WEAPONS_ATLAS_PNG));
copyFileSync(join(UI_ATLAS_DIR, WEAPONS_ATLAS_PNG), join(OUT_DIR, WEAPONS_ATLAS_PNG));

let weaponIconCount = 0;
const weaponsOutput = {
  version: 1,
  weapons: Object.fromEntries(
    Object.entries(WEAPON_DATA).map(([id, { name, damageMin, damageMax, sprite }]) => {
      const spriteName = resolveWeaponSprite(sprite, weaponSprites);
      const rect = spriteName ? weaponSprites.get(spriteName) : null;
      const icon = rect
        ? { atlas: WEAPONS_ATLAS_PNG, ...rect, aw: weaponsAtlasSize.w, ah: weaponsAtlasSize.h }
        : null;
      if (icon) weaponIconCount++;
      return [id, { name, damageMin, damageMax, icon }];
    })
  ),
};
writeFileSync(join(OUT_DIR, 'weapons.json'), JSON.stringify(weaponsOutput, null, 2));

console.log(`Wrote ${OUT_DIR}/weapons.json — ${weaponIconCount}/${Object.keys(WEAPON_DATA).length} weapons have icons`);

// ---------------------------------------------------------------------------
// Pet icons from the Pet_*_HD atlases. Pets reference a head sprite (preferred)
// or a full-body sprite; we resolve against a combined sprite map and copy the
// PNGs that actually get used. (readdirSync/copyFileSync/writeFileSync, join,
// parseNguiAtlas, pngSize, UI_ATLAS_DIR and OUT_DIR are all already in scope.)
// ---------------------------------------------------------------------------
const petAtlasPrefabs = readdirSync(UI_ATLAS_DIR).filter((f) => /^Pet_.*_HD\.prefab$/.test(f));
const petSpriteToAtlas = new Map(); // spriteName -> { atlasPng, rect, aw, ah }
for (const prefab of petAtlasPrefabs) {
  const png = prefab.replace('.prefab', '.png');
  const sprites = parseNguiAtlas(join(UI_ATLAS_DIR, prefab));
  if (sprites.size === 0) continue;
  const size = pngSize(join(UI_ATLAS_DIR, png));
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

console.log(
  `Wrote ${OUT_DIR}/index.json` +
  ` — types: ${Object.entries(byType).map(([t, l]) => `${t}=${l.length}`).join(' ')}` +
  ` — atlases: ${referencedAtlases.size}`
);
