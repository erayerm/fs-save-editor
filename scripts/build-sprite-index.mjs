// Build the runtime sprite index for dweller customization pieces.
// Reads from the AssetRipper "Export Unity Project" output and writes to public/atlas/.
//
// Usage:  node scripts/build-sprite-index.mjs
import {
  readFileSync, readdirSync, writeFileSync, mkdirSync, statSync, copyFileSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import { parseHeadgearPlacement } from './lib/parseHeadgear.mjs';
import { decodeIndexBuffer, decodeVertexStreams } from './lib/decodeMesh.mjs';

const ROOT = 'TEMPORARY-game-files/export-3/ExportedProject/Assets';
const SCRIPTS_DIR = join(ROOT, 'Scripts/Assembly-CSharp');
const MB_DIR = join(ROOT, 'MonoBehaviour');
const ATLAS_DIR = join(ROOT, 'Resources/dwelleratlases');
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

  return { type, m_Name, m_guid, m_atlasGuid, bounds, gender, flags, colors,
    headgearPlacement, maleMeshMetaGuid, femaleMeshMetaGuid };
}

const referencedAtlases = new Set();
const byType = {
  body: [], outfit: [], outfitColoringMask: [], face: [], faceMask: [],
  hair: [], helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
};

const files = readdirSync(MB_DIR).filter((f) => f.endsWith('.asset')).sort();
for (const f of files) {
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

function decodeMeshAsset(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const vertexCount = +text.match(/m_VertexCount:\s*(\d+)/)[1];
    const indexCount = +text.match(/indexCount:\s*(\d+)/)[1];
    const indexHex = text.match(/m_IndexBuffer:\s*([0-9a-f]+)/)[1];
    const vertHex = text.match(/_typelessdata:\s*([0-9a-f]+)/)[1];
    const indices = decodeIndexBuffer(indexHex, indexCount);
    const { positions, uvs, uvs1 } = decodeVertexStreams(vertHex, vertexCount);
    return { positions, uvs, uvs1, indices };
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

const index = { version: 1, byType };
writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

console.log(
  `Wrote ${OUT_DIR}/index.json` +
  ` — types: ${Object.entries(byType).map(([t, l]) => `${t}=${l.length}`).join(' ')}` +
  ` — atlases: ${referencedAtlases.size}`
);
