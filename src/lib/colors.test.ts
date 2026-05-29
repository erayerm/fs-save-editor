import { describe, it, expect } from 'vitest';
import { decodeArgb, encodeArgb } from './colors';

describe('colors', () => {
  it('decodes a 32-bit ARGB int into 0..255 channels', () => {
    const n = (0xff << 24 | 0x12 << 16 | 0x34 << 8 | 0x56) >>> 0;
    expect(decodeArgb(n)).toEqual({ r: 0x12, g: 0x34, b: 0x56, a: 0xff });
  });

  it('returns undefined for non-finite input', () => {
    expect(decodeArgb('nope')).toBeUndefined();
    expect(decodeArgb(undefined)).toBeUndefined();
  });

  it('round-trips encode(decode(n)) === n', () => {
    const n = (0x80 << 24 | 0xab << 16 | 0xcd << 8 | 0xef) >>> 0;
    const back = encodeArgb(decodeArgb(n)!);
    expect(back).toBe(n);
  });

  it('defaults missing alpha to 0xFF on encode', () => {
    expect(encodeArgb({ r: 1, g: 2, b: 3 })).toBe((0xff << 24 | 1 << 16 | 2 << 8 | 3) >>> 0);
  });
});
