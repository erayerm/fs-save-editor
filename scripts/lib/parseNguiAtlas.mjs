// Parse an NGUI UIAtlas prefab (Fallout Shelter's `*_HD.prefab` files).
// Each atlas prefab carries an `mSprites:` list of `{ name, x, y, width, height, ... }`
// entries giving the pixel rect of each sprite within the companion PNG.
// Coordinates are top-left origin, Y measured downward from the top of the texture.
import { readFileSync } from 'node:fs';

/**
 * @returns {Map<string, {x:number,y:number,w:number,h:number}>} sprite name -> rect
 */
export function parseNguiAtlas(prefabPath) {
  const text = readFileSync(prefabPath, 'utf8');
  const out = new Map();
  // Sprite entries look like:
  //   - name: 0.32Pistol
  //     x: 1948
  //     y: 1491
  //     width: 90
  //     height: 167
  const re = /-\s*name:\s*(.+?)\s*\n\s*x:\s*(\d+)\s*\n\s*y:\s*(\d+)\s*\n\s*width:\s*(\d+)\s*\n\s*height:\s*(\d+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.set(m[1], { x: +m[2], y: +m[3], w: +m[4], h: +m[5] });
  }
  return out;
}

/** Read width/height from a PNG file's IHDR header. */
export function pngSize(pngPath) {
  const b = readFileSync(pngPath);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
