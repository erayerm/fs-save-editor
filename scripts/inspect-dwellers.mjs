import { readFileSync } from 'node:fs';

const KEY = Uint8Array.from('a7ca9f3366d892c2f0bef417341ca971b69ae9f7bacccffcf43c62d1d7d021f9'.match(/.{2}/g).map(b=>parseInt(b,16)));
const IV  = Uint8Array.from('7475383967656a693334307438397532'.match(/.{2}/g).map(b=>parseInt(b,16)));

const b64 = readFileSync('tests/fixtures/Vault1.sav','utf8').trim();
const cipher = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
const key = await crypto.subtle.importKey('raw',KEY,{name:'AES-CBC'},false,['decrypt']);
const plain = await crypto.subtle.decrypt({name:'AES-CBC',iv:IV},key,cipher);
const json = JSON.parse(new TextDecoder().decode(plain));

const toRGBA = (n) => n == null ? null : { r:(n>>>16)&0xFF, g:(n>>>8)&0xFF, b:n&0xFF, a:(n>>>24)&0xFF };

json.dwellers.dwellers.slice(0, 8).forEach(d => {
  console.log({
    name: d.name, lastName: d.lastName,
    gender: d.gender,
    hair: d.hair,
    outfit: d.equipedOutfit?.id,
    skinColor: toRGBA(d.skinColor),
    hairColor: toRGBA(d.hairColor),
    outfitColor: toRGBA(d.outfitColor),
  });
});
