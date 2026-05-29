import { readFileSync } from 'node:fs';
// Node 22 has crypto.subtle globally — no polyfill needed

const KEY_HEX = "a7ca9f3366d892c2f0bef417341ca971b69ae9f7bacccffcf43c62d1d7d021f9";
const IV_HEX  = "7475383967656a693334307438397532";
const hex = (h) => Uint8Array.from(h.match(/.{2}/g).map((b) => parseInt(b, 16)));

const b64 = readFileSync('tests/fixtures/Vault1.sav', 'utf8').trim();
const cipher = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const key = await crypto.subtle.importKey('raw', hex(KEY_HEX), { name: 'AES-CBC' }, false, ['decrypt']);
const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: hex(IV_HEX) }, key, cipher);
const json = JSON.parse(new TextDecoder().decode(plain));
const d = json.dwellers.dwellers[0];
console.log(JSON.stringify(d, null, 2));
