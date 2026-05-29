import { decryptBytes, encryptBytes } from './savCrypto';
import type { SaveJson } from '../types/save';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function decodeSav(savText: string): Promise<SaveJson> {
  const cipher = base64ToBytes(savText);
  const plain = await decryptBytes(cipher);
  const json = new TextDecoder('utf-8').decode(plain);
  return JSON.parse(json) as SaveJson;
}

export async function encodeSav(data: SaveJson): Promise<string> {
  const json = JSON.stringify(data);
  const plain = new TextEncoder().encode(json);
  const cipher = await encryptBytes(plain);
  return bytesToBase64(cipher);
}
