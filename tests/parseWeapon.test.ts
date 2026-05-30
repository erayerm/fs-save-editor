import { describe, it, expect } from 'vitest';
import { parseWeapon } from '../scripts/lib/parseWeapon.mjs';

const ASSET = `
  m_Name: Railgun
  m_damageMin: 18
  m_damageMax: 22
`;
describe('parseWeapon', () => {
  it('extracts name and damage range', () => {
    expect(parseWeapon(ASSET)).toMatchObject({ name: 'Railgun', damageMin: 18, damageMax: 22 });
  });
});
