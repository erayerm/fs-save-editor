import type { Rgb } from './dwellerRender';

export function decodeArgb(n: unknown): Rgb | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return {
    r: (n >>> 16) & 0xff,
    g: (n >>> 8) & 0xff,
    b: n & 0xff,
    a: (n >>> 24) & 0xff,
  };
}

export function encodeArgb(c: Rgb): number {
  const a = c.a == null ? 0xff : c.a;
  return ((a << 24) | (c.r << 16) | (c.g << 8) | c.b) >>> 0;
}
