// Resolve a weapon's m_WeaponSprite (from the game data) to its atlas sprite name
// in Weapons_HD.prefab. The game stores the exact sprite name per weapon, so we
// match it (case/punctuation-insensitive) against the atlas sprite list.
//
// A few sprite names differ slightly from the atlas key (atlas-side typos or
// shared art); those are listed in ALIAS, mapping m_WeaponSprite -> atlas name.

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// m_WeaponSprite value -> atlas sprite name (for non-1:1 cases)
const ALIAS = {
  CombatShotgun: 'CombatShogun', // sprite name is misspelled in the atlas
};

/**
 * @param {string} sprite the weapon's m_WeaponSprite value (from WEAPON_DATA)
 * @param {Map<string, unknown>} spriteMap atlas sprite name -> rect
 * @returns {string|null} the matching atlas sprite name, or null if none
 */
export function resolveWeaponSprite(sprite, spriteMap) {
  if (!sprite) return null;

  const byNorm = new Map();
  for (const name of spriteMap.keys()) byNorm.set(norm(name), name);

  const direct = byNorm.get(norm(sprite));
  if (direct) return direct;

  const alias = ALIAS[sprite];
  if (alias && spriteMap.has(alias)) return alias;

  // Last resort: strip a trailing variant suffix (e.g. "Foo_Rusty" -> "Foo").
  const base = sprite.split('_')[0];
  return byNorm.get(norm(base)) ?? null;
}
