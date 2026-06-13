import { describe, it, expect } from 'vitest';
import { parsePetData } from './parsePetData.mjs';

const SAMPLE = `  m_petDataList:
  - m_id: blacklab_c
    m_baseName: Black Lab
    m_Item:
      m_itemRarity: 2
      m_Sprite: BlackLabrador_FullBody
      m_HeadSprite: BlackLabrador_Head
      m_type: 0
      m_breed: 0
      m_bonusEffectList:
      - m_bonusEffect: 67108864
        m_minValue: 6
        m_maxValue: 10
      m_audioEventOverridesByAudioID: []
  - m_id: blacklab_l
    m_baseName: Old Yeller
    m_Item:
      m_itemRarity: 4
      m_Sprite: BlackLabrador_FullBody
      m_HeadSprite: BlackLabrador_Head
      m_type: 0
      m_breed: 0
      m_bonusEffectList:
      - m_bonusEffect: 134217728
        m_minValue: 3
        m_maxValue: 3
      m_audioEventOverridesByAudioID: []`;

describe('parsePetData', () => {
  it('parses every pet entry with its first bonus effect', () => {
    const pets = parsePetData(SAMPLE);
    expect(pets).toHaveLength(2);
    expect(pets[0]).toEqual({
      id: 'blacklab_c', baseName: 'Black Lab', rarity: 2, type: 0, breed: 0,
      headSprite: 'BlackLabrador_Head', fullBodySprite: 'BlackLabrador_FullBody',
      bonusEffect: 67108864, minValue: 6, maxValue: 10,
    });
  });
  it('captures the legendary base name', () => {
    const pets = parsePetData(SAMPLE);
    expect(pets[1].baseName).toBe('Old Yeller');
    expect(pets[1].rarity).toBe(4);
  });
});
