// src/lib/demoSav.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeSav } from './savFile';
// @ts-expect-error plain .mjs module without type declarations
import { MALE_FIRST, FEMALE_FIRST, LAST_NAMES } from '../../scripts/lib/demoNames.mjs';

describe('bundled demo save', () => {
  it('decodes, has 7 dwellers, and uses only pool names', async () => {
    const text = readFileSync('public/demo.sav', 'utf8');
    const save = await decodeSav(text);
    const dwellers = save.dwellers.dwellers;
    expect(dwellers).toHaveLength(7);
    const firstPool = new Set([...MALE_FIRST, ...FEMALE_FIRST]);
    const lastPool = new Set(LAST_NAMES);
    for (const d of dwellers) {
      expect(firstPool.has(d.name)).toBe(true);
      expect(lastPool.has(d.lastName)).toBe(true);
    }
  });
});
