// scripts/make-demo-sav.mjs
// One-time generator: trims public/Vault1.sav to 7 dwellers, randomizes
// their names, and writes the result to public/demo.sav.
// Usage: node scripts/make-demo-sav.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { MALE_FIRST, FEMALE_FIRST, LAST_NAMES } from './lib/demoNames.mjs';

const KEY = Uint8Array.from('a7ca9f3366d892c2f0bef417341ca971b69ae9f7bacccffcf43c62d1d7d021f9'.match(/.{2}/g).map((b) => parseInt(b, 16)));
const IV = Uint8Array.from('7475383967656a693334307438397532'.match(/.{2}/g).map((b) => parseInt(b, 16)));

const SRC = 'public/Vault1.sav';
const OUT = 'public/demo.sav';
const DWELLER_COUNT = 7;

const b64 = readFileSync(SRC, 'utf8').trim();
const cipher = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const key = await crypto.subtle.importKey('raw', KEY, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: IV }, key, cipher);
const json = JSON.parse(new TextDecoder().decode(plain));

json.dwellers.dwellers = json.dwellers.dwellers.slice(0, DWELLER_COUNT);

// Draw without replacement so names within a pool are unique.
function drawFrom(pool) {
  const i = Math.floor(Math.random() * pool.length);
  return pool.splice(i, 1)[0];
}

const males = [...MALE_FIRST];
const females = [...FEMALE_FIRST];
const lasts = [...LAST_NAMES];

for (const d of json.dwellers.dwellers) {
  d.name = d.gender === 1 ? drawFrom(females) : drawFrom(males);
  d.lastName = drawFrom(lasts);
}

const outPlain = new TextEncoder().encode(JSON.stringify(json));
const outCipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: IV }, key, outPlain));
writeFileSync(OUT, Buffer.from(outCipher).toString('base64'));

console.log(`Wrote ${OUT} with ${json.dwellers.dwellers.length} dwellers:`);
for (const d of json.dwellers.dwellers) console.log(`  ${d.name} ${d.lastName}`);
