import { describe, it, expect } from 'vitest';
import { isChildDweller } from '../src/lib/dwellerRender';

describe('isChildDweller', () => {
  it('true when experience.currentLevel is 0', () => {
    expect(isChildDweller({ experience: { currentLevel: 0 } })).toBe(true);
  });
  it('false for adults (level >= 1)', () => {
    expect(isChildDweller({ experience: { currentLevel: 1 } })).toBe(false);
  });
  it('false when level missing (assume adult)', () => {
    expect(isChildDweller({})).toBe(false);
  });
});
