// scripts/build-dweller-mesh.mjs
// Decode the per-gender dweller meshes + gender UV offsets into public/atlas/meshes.json.
// Usage: node scripts/build-dweller-mesh.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodeIndexBuffer, decodeVertexStreams } from './lib/decodeMesh.mjs';

const ROOT = 'TEMPORARY-game-files/export-3/ExportedProject/Assets';
const MESH_DIR = join(ROOT, 'Mesh');
const OUT_DIR = 'public/atlas';
mkdirSync(OUT_DIR, { recursive: true });

// Confirmed from MainScene.unity Catalog component.
const GENDER_MESH_GUID = {
  male:   { adult: '995b06f52d66aa84d8240050c4a36d79', child: '917459378ee49d74eb192e90938e4b8e' },
  female: { adult: '5e59d1176102a304c99647c42e382461', child: '9a844434723b010499aec0c5d227d011' },
};
const GENDER_OFFSETS = {
  male:   { hand: [0, -0.126],          face: [-0.004, -0.005] },
  female: { hand: [-0.1056719, -0.1547891], face: [-0.0025, -0.005] },
};

// Build mesh GUID -> .asset path via .meta files.
const guidToAssetPath = new Map();
for (const f of readdirSync(MESH_DIR)) {
  if (!f.endsWith('.asset.meta')) continue;
  const guid = readFileSync(join(MESH_DIR, f), 'utf8').match(/^guid:\s*([0-9a-f]+)/m)?.[1];
  if (guid) guidToAssetPath.set(guid, join(MESH_DIR, f.replace(/\.meta$/, '')));
}

function decodeMeshAsset(path) {
  const text = readFileSync(path, 'utf8');
  const vertexCount = +text.match(/m_VertexCount:\s*(\d+)/)[1];
  const indexCount = +text.match(/indexCount:\s*(\d+)/)[1];
  const indexHex = text.match(/m_IndexBuffer:\s*([0-9a-f]+)/)[1];
  const vertHex = text.match(/_typelessdata:\s*([0-9a-f]+)/)[1];
  const indices = decodeIndexBuffer(indexHex, indexCount);
  const { positions, uvs, uvs1 } = decodeVertexStreams(vertHex, vertexCount);
  return { positions, uvs, uvs1, indices };
}

const out = {};
for (const [gender, guids] of Object.entries(GENDER_MESH_GUID)) {
  out[gender] = { offsets: GENDER_OFFSETS[gender] };
  for (const [age, guid] of Object.entries(guids)) {
    const path = guidToAssetPath.get(guid);
    if (!path) throw new Error(`Mesh GUID ${guid} (${gender}/${age}) not found`);
    out[gender][age] = decodeMeshAsset(path);
  }
}

const meshes = { version: 1, atlasSize: 1024, ...out };
writeFileSync(join(OUT_DIR, 'meshes.json'), JSON.stringify(meshes));
console.log(
  `Wrote ${OUT_DIR}/meshes.json — ` +
  Object.entries(out).map(([g, d]) =>
    `${g}: adult=${d.adult.positions.length}v/${d.adult.indices.length}i child=${d.child.positions.length}v`
  ).join('  ')
);
