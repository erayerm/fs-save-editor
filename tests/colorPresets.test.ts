import { describe, it, expect } from 'vitest';
import { HAIR_PRESETS, SKIN_PRESETS } from '../src/lib/colorPresets';

describe('color presets', () => {
  it('exposes a non-trivial hair palette', () => {
    expect(HAIR_PRESETS.length).toBeGreaterThanOrEqual(12);
    for (const c of HAIR_PRESETS) {
      expect(c.r).toBeGreaterThanOrEqual(0); expect(c.r).toBeLessThanOrEqual(255);
    }
  });
  it('exposes a skin palette', () => {
    expect(SKIN_PRESETS.length).toBeGreaterThanOrEqual(6);
  });
});
