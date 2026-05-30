/**
 * Parse a Unity text-asset weapon MonoBehaviour and extract name + damage range.
 * @param {string} text - The raw text content of the .asset file.
 * @returns {{ name: string, damageMin: number, damageMax: number }}
 */
export function parseWeapon(text) {
  const name = text.match(/^\s*m_Name:\s*(.+?)\s*$/m)?.[1] ?? '';
  const damageMin = Number(text.match(/^\s*m_damageMin:\s*(-?\d+(?:\.\d+)?)/m)?.[1] ?? 0);
  const damageMax = Number(text.match(/^\s*m_damageMax:\s*(-?\d+(?:\.\d+)?)/m)?.[1] ?? 0);
  return { name, damageMin, damageMax };
}
