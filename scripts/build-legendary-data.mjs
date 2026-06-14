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
  let name;
  try {
    name = readFileSync(join(MB_DIR, assetName), 'utf8').match(/^\s*m_Name:\s*(.+?)\s*$/m)?.[1];
  } catch {
    continue; // sibling asset doesn't exist, skip
  }
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
