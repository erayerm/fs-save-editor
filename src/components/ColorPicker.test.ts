import { describe, it, expect } from 'vitest';
import { rgbToHex, hexToRgb } from './ColorPicker';

describe('ColorPicker conversions', () => {
  it('rgbToHex formats lowercase #rrggbb', () => {
    expect(rgbToHex({ r: 0x12, g: 0x34, b: 0x56 })).toBe('#123456');
  });

  it('rgbToHex zero-pads single-digit channels', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
  });

  it('hexToRgb parses #rrggbb keeping alpha 255', () => {
    expect(hexToRgb('#abcdef')).toEqual({ r: 0xab, g: 0xcd, b: 0xef, a: 255 });
  });

  it('round-trips hexToRgb(rgbToHex(c))', () => {
    const c = { r: 9, g: 99, b: 199, a: 255 };
    expect(hexToRgb(rgbToHex(c))).toEqual(c);
  });
});
