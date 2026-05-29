import { describe, it, expect } from 'vitest';
import { encryptBytes, decryptBytes } from './savCrypto';

describe('savCrypto', () => {
  it('round-trips arbitrary plaintext via AES-CBC', async () => {
    const text = new TextEncoder().encode('{"hello":"world","n":42}');
    const cipher = await encryptBytes(text);
    const back = await decryptBytes(cipher);
    expect(new TextDecoder().decode(back)).toBe('{"hello":"world","n":42}');
  });

  it('produces ciphertext that is a multiple of 16 bytes', async () => {
    const cipher = await encryptBytes(new Uint8Array([1, 2, 3]));
    expect(cipher.byteLength % 16).toBe(0);
  });
});
