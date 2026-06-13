/**
 * Parse the m_petDataList block of PetsCustomizationData.asset into pet records.
 * Each record uses the FIRST entry of m_bonusEffectList (pets define one bonus).
 * @param {string} text raw contents of PetsCustomizationData.asset
 * @returns {Array<{id:string,baseName:string,rarity:number,type:number,breed:number,
 *   headSprite:string,fullBodySprite:string,bonusEffect:number,minValue:number,maxValue:number}>}
 */
export function parsePetData(text) {
  const start = text.indexOf('m_petDataList:');
  const body = start >= 0 ? text.slice(start) : text;
  // Split on the list marker for each pet entry ("  - m_id:").
  const chunks = body.split(/\n\s{2}-\s+m_id:\s*/).slice(1);
  const grab = (s, re) => s.match(re)?.[1];
  const pets = [];
  for (const raw of chunks) {
    const chunk = 'm_id: ' + raw;
    const id = grab(chunk, /^m_id:\s*(\S+)/);
    if (!id) continue;
    const bonus = chunk.match(/m_bonusEffect:\s*(-?\d+)\s*\n\s*m_minValue:\s*(-?\d+(?:\.\d+)?)\s*\n\s*m_maxValue:\s*(-?\d+(?:\.\d+)?)/);
    pets.push({
      id,
      baseName: grab(chunk, /^\s*m_baseName:\s*(.+?)\s*$/m) ?? id,
      rarity: Number(grab(chunk, /m_itemRarity:\s*(\d+)/) ?? 0),
      type: Number(grab(chunk, /m_type:\s*(\d+)/) ?? 0),
      breed: Number(grab(chunk, /m_breed:\s*(\d+)/) ?? 0),
      headSprite: grab(chunk, /m_HeadSprite:\s*(\S+)/) ?? '',
      fullBodySprite: grab(chunk, /m_Sprite:\s*(\S+)/) ?? '',
      bonusEffect: bonus ? Number(bonus[1]) : 0,
      minValue: bonus ? Number(bonus[2]) : 0,
      maxValue: bonus ? Number(bonus[3]) : 0,
    });
  }
  return pets;
}
