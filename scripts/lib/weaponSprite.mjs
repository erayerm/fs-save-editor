// Resolve a save weapon id (e.g. "HuntingRifle_Rusty") to its atlas sprite name
// in Weapons_HD.prefab. The game reuses one base sprite across every stat/quality
// variant of a weapon, so we strip the variant suffix (everything after the first
// "_") and match the base name against the atlas sprite list.
//
// A handful of bases don't match a sprite name 1:1 (decimal prefixes, sprite-side
// typos, or generic ids that reuse another weapon's art). Those are listed in
// ALIAS, mapping base id -> exact sprite name.

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// base weapon id -> atlas sprite name (for non-1:1 cases)
const ALIAS = {
  '32Pistol': '0.32Pistol',
  '10mmPistol': 'Pistol',
  Scoped44: 'MagnumRevolver',
  GaussPistol: 'GaussPistolRusty',
  Rifle: 'HuntingRifle',
  RailwayRifle: 'HuntingRifle',
  CombatShotgun: 'CombatShogun', // sprite name is misspelled in the atlas
  SawedOffShotgun: 'SawedOff',
  GragnaksAxe: 'GrognaksAxe',
  KitchenKnife: 'butcher_knife',
  Switchblade: 'butcher_knife',
  PoolCue: 'baseball_bat',
  RelentlessRaiderSword: 'bumper_sword',
};

/**
 * @param {string} id weapon id from the save / WEAPON_DATA
 * @param {Map<string, unknown>} spriteMap sprite name -> rect (keys used for matching)
 * @returns {string|null} the matching sprite name, or null if none
 */
export function resolveWeaponSprite(id, spriteMap) {
  const base = id.split('_')[0];

  // Build a normalized lookup once per call is cheap (small maps); callers can
  // also pass a prebuilt map, but keeping it self-contained is simpler.
  const byNorm = new Map();
  for (const name of spriteMap.keys()) byNorm.set(norm(name), name);

  const direct = byNorm.get(norm(base));
  if (direct) return direct;

  const alias = ALIAS[base];
  if (alias && spriteMap.has(alias)) return alias;

  return null;
}
