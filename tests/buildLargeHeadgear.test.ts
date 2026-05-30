import { describe, it, expect } from 'vitest';
import { parseHeadgearPlacement } from '../scripts/lib/parseHeadgear.mjs';

const MITRE = `
  m_grabPoint: {x: 0.4217, y: 0.009}
  m_offset: {x: 0.0, y: 0.5}
  m_scale: {x: 0.1123, y: 0.1084}
`;

describe('parseHeadgearPlacement', () => {
  it('extracts grabPoint, offset and scale vectors', () => {
    expect(parseHeadgearPlacement(MITRE)).toEqual({
      grabPoint: [0.4217, 0.009],
      offset: [0.0, 0.5],
      scale: [0.1123, 0.1084],
    });
  });

  it('returns null when no placement fields are found', () => {
    expect(parseHeadgearPlacement('m_unrelated: foo')).toBeNull();
  });
});
