import { describe, it, expect } from 'vitest';
import { parseLegendaryAsset } from './parseLegendaryData.mjs';

// Trimmed real-shape sample (Jericho: hairPiece none, facemask via guid, empty weapon override uses a real id here).
const JERICHO = `%YAML 1.1
MonoBehaviour:
  m_Name: L_Jericho
  m_hairPiece: {fileID: 0}
  m_outfitItemId: WandererArmor_Heavy
  m_skinColor: {r: 0.9137255, g: 0.83137256, b: 0.7058824, a: 1}
  m_hairColor: {r: 0.4117647, g: 0.34901962, b: 0.3254902, a: 1}
  m_gender: 1
  m_facemask: {fileID: 11400000, guid: FACEGUID, type: 2}
  m_weaponItemId: AssaultRifle_Infiltrator
  m_name: Jericho
  m_lastName:
  m_stats:
    m_strength: 8
    m_perception: 6
    m_endurance: 8
    m_charisma: 2
    m_intelligence: 3
    m_agility: 7
    m_luck: 6
`;

// Entry with an empty weapon and a hairPiece guid, female gender.
const MOIRA = `MonoBehaviour:
  m_Name: L_Moira Brown
  m_hairPiece: {fileID: 11400000, guid: HAIRGUID, type: 2}
  m_outfitItemId: HandymanJumpsuit_Expert
  m_skinColor: {r: 1, g: 1, b: 1, a: 1}
  m_hairColor: {r: 0, g: 0, b: 0, a: 1}
  m_gender: 2
  m_facemask: {fileID: 0}
  m_weaponItemId:
  m_name: Moira
  m_lastName: Brown
  m_stats:
    m_strength: 1
    m_perception: 2
    m_endurance: 3
    m_charisma: 4
    m_intelligence: 5
    m_agility: 6
    m_luck: 7
`;

// A Mr-Handy-style record with no SPECIAL stats — must be skipped.
const SNIP = `MonoBehaviour:
  m_Name: L_SnipSnip
  m_outfitItemId:
`;

const resolve = (guid) => ({ FACEGUID: 'f_hair_11', HAIRGUID: '22' }[guid] ?? null);

describe('parseLegendaryAsset', () => {
  it('parses a male entry, inverts gender, resolves facemask, encodes colors', () => {
    const e = parseLegendaryAsset(JERICHO, resolve);
    expect(e.uniqueData).toBe('L_Jericho');
    expect(e.name).toBe('Jericho');
    expect(e.lastName).toBe('');
    expect(e.gender).toBe(2); // asset 1 (male) -> save 2
    expect(e.outfitId).toBe('WandererArmor_Heavy');
    expect(e.weaponId).toBe('AssaultRifle_Infiltrator');
    expect(e.special).toEqual([8, 6, 8, 2, 3, 7, 6]);
    expect(e.hair).toBeNull();
    expect(e.faceMask).toBe('f_hair_11');
    // 0.9137255*255 ≈ 233, g 212, b 180, a 255 -> 0xFFE9D4B4
    expect(e.skinColor).toBe(0xffe9d4b4);
  });

  it('parses a female entry, resolves hair, keeps empty weapon as empty string', () => {
    const e = parseLegendaryAsset(MOIRA, resolve);
    expect(e.gender).toBe(1); // asset 2 (female) -> save 1
    expect(e.hair).toBe('22');
    expect(e.faceMask).toBeNull();
    expect(e.weaponId).toBe('');
    expect(e.special).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns null for records without SPECIAL stats', () => {
    expect(parseLegendaryAsset(SNIP, resolve)).toBeNull();
  });
});
