import { describe, it, expect } from 'vitest';
import { windowedRange } from '../src/lib/useWindowedRange';

describe('windowedRange', () => {
  it('returns the visible index span plus overscan', () => {
    expect(windowedRange(0, 500, 120, 200, 2)).toEqual({ start: 0, end: 7 });
    expect(windowedRange(1200, 500, 120, 200, 2)).toEqual({ start: 8, end: 17 });
  });
  it('clamps to [0, count)', () => {
    expect(windowedRange(0, 500, 120, 3, 2)).toEqual({ start: 0, end: 3 });
  });
});
