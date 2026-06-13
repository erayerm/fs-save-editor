/**
 * Parse EBonusEffect.cs into a Map<intValue, enumName>.
 * Handles plain ints, negatives, and the `int.MinValue` literal (-2147483648).
 * @param {string} text raw contents of EBonusEffect.cs
 * @returns {Map<number, string>}
 */
export function parseEBonusEffect(text) {
  const map = new Map();
  const re = /^\s*([A-Za-z_]\w*)\s*=\s*(int\.MinValue|-?\d+)\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const value = m[2] === 'int.MinValue' ? -2147483648 : Number(m[2]);
    map.set(value, name);
  }
  return map;
}
