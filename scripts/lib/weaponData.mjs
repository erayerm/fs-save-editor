/**
 * Curated weapon data table for Fallout Shelter.
 * Damage ranges sourced from community documentation (Fallout Wiki / Fallout Shelter wiki).
 * icon is always '' — no icon assets are available.
 *
 * id: the literal string used in save files (e.g. m_WeaponId).
 */

// prettier-ignore
export const WEAPON_DATA = {
  // ── Melee / unarmed ─────────────────────────────────────────────────────────
  Fist:                            { name: 'Fist',                        damageMin:  0, damageMax:  1 },
  BaseballBat:                     { name: 'Baseball bat',                 damageMin:  4, damageMax:  8 },
  ButcherKnife:                    { name: 'Butcher knife',                damageMin:  5, damageMax:  9 },
  KitchenKnife:                    { name: 'Kitchen knife',                damageMin:  3, damageMax:  7 },
  Pickaxe:                         { name: 'Pickaxe',                      damageMin:  6, damageMax: 10 },
  PoolCue:                         { name: 'Pool cue',                     damageMin:  3, damageMax:  7 },
  FireHydrantBat:                  { name: 'Fire hydrant bat',             damageMin:  8, damageMax: 12 },
  RelentlessRaiderSword:           { name: 'Relentless raider sword',      damageMin: 10, damageMax: 15 },
  Switchblade:                     { name: 'Switchblade',                  damageMin:  5, damageMax:  9 },
  GragnaksAxe:                     { name: "Grognak's axe",                damageMin: 21, damageMax: 26 },
  SuperSledge:                     { name: 'Super sledge',                 damageMin: 21, damageMax: 26 },
  // Ripper family
  Ripper_Rusty:                    { name: 'Rusty ripper',                 damageMin:  8, damageMax: 12 },
  Ripper:                          { name: 'Ripper',                       damageMin: 10, damageMax: 15 },
  Ripper_Enhanced:                 { name: 'Enhanced ripper',              damageMin: 13, damageMax: 18 },
  Ripper_Hardened:                 { name: 'Hardened ripper',              damageMin: 16, damageMax: 21 },
  SurgicalRipper_Rusty:            { name: 'Rusty surgical ripper',        damageMin: 10, damageMax: 14 },
  SurgicalRipper:                  { name: 'Surgical ripper',              damageMin: 13, damageMax: 17 },
  SurgicalRipper_Enhanced:         { name: 'Enhanced surgical ripper',     damageMin: 16, damageMax: 21 },
  SurgicalRipper_Hardened:         { name: 'Hardened surgical ripper',     damageMin: 19, damageMax: 24 },
  // Power fist family
  PowerFist_Rusty:                 { name: 'Rusty power fist',             damageMin: 11, damageMax: 16 },
  PowerFist:                       { name: 'Power fist',                   damageMin: 14, damageMax: 19 },
  PowerFist_Enhanced:              { name: 'Enhanced power fist',          damageMin: 17, damageMax: 23 },
  PowerFist_Hardened:              { name: 'Hardened power fist',          damageMin: 21, damageMax: 27 },
  PowerFist_Eds:                   { name: "Ed's custom power fist",       damageMin: 24, damageMax: 30 },

  // ── Pistols ──────────────────────────────────────────────────────────────────
  // .32 pistol family (save-string ids use "32" prefix without leading zero)
  '32Pistol_Rusty':                { name: 'Rusty .32 pistol',             damageMin:  5, damageMax:  9 },
  '32Pistol':                      { name: '.32 pistol',                   damageMin:  7, damageMax: 11 },
  '32Pistol_Enhanced':             { name: 'Enhanced .32 pistol',          damageMin:  9, damageMax: 13 },
  '32Pistol_Hardened':             { name: 'Hardened .32 pistol',          damageMin: 11, damageMax: 15 },
  '32Pistol_ArmorPiercing':        { name: 'Armor piercing .32 pistol',    damageMin: 13, damageMax: 17 },
  '32Pistol_WildBills':            { name: "Wild Bill's Sidearm",          damageMin: 15, damageMax: 20 },
  // The save sometimes stores '032Pistol' (with leading zero) — treat it as the base .32 pistol
  '032Pistol':                     { name: '.32 pistol',                   damageMin:  7, damageMax: 11 },
  // 10mm family
  '10mmPistol_Rusty':              { name: 'Rusty 10mm pistol',            damageMin:  7, damageMax: 11 },
  '10mmPistol':                    { name: '10mm pistol',                  damageMin:  9, damageMax: 14 },
  '10mmPistol_Enhanced':           { name: 'Enhanced 10mm pistol',         damageMin: 12, damageMax: 16 },
  '10mmPistol_Hardened':           { name: 'Hardened 10mm pistol',         damageMin: 14, damageMax: 19 },
  '10mmPistol_ArmorPiercing':      { name: 'Armor piercing 10mm pistol',   damageMin: 17, damageMax: 22 },
  '10mmPistol_LoneWanderer':       { name: 'Lone Wanderer',                damageMin: 20, damageMax: 25 },
  // Scoped .44 family
  Scoped44_Rusty:                  { name: 'Rusty scoped .44',             damageMin:  9, damageMax: 13 },
  Scoped44:                        { name: 'Scoped .44',                   damageMin: 12, damageMax: 16 },
  Scoped44_Enhanced:               { name: 'Enhanced scoped .44',          damageMin: 15, damageMax: 20 },
  Scoped44_Hardened:               { name: 'Hardened scoped .44',          damageMin: 18, damageMax: 24 },
  Scoped44_ArmorPiercing:          { name: 'Armor piercing scoped .44',    damageMin: 22, damageMax: 28 },
  Scoped44_Blackhawk:              { name: 'Blackhawk',                    damageMin: 25, damageMax: 31 },
  // Gauss pistol family
  GaussPistol_Rusty:               { name: 'Rusty Gauss pistol',           damageMin: 12, damageMax: 17 },
  GaussPistol_Focused:             { name: 'Focused Gauss pistol',         damageMin: 15, damageMax: 20 },
  GaussPistol_Enhanced:            { name: 'Enhanced Gauss pistol',        damageMin: 18, damageMax: 24 },
  GaussPistol_Hardened:            { name: 'Hardened Gauss pistol',        damageMin: 22, damageMax: 28 },
  // Pipe pistol family
  PipePistol:                      { name: 'Pipe pistol',                  damageMin:  5, damageMax:  9 },
  PipePistol_HairTrigger:          { name: 'Hair trigger pipe pistol',     damageMin:  6, damageMax: 10 },
  PipePistol_Heavy:                { name: 'Heavy pipe pistol',            damageMin:  7, damageMax: 11 },
  PipePistol_Scoped:               { name: 'Scoped pipe pistol',           damageMin:  7, damageMax: 11 },
  PipePistol_Auto:                 { name: 'Auto pipe pistol',             damageMin:  6, damageMax: 10 },
  PipePistol_LittleBrother:        { name: 'Little Brother',               damageMin: 10, damageMax: 15 },
  // Energy pistols
  AlienBlaster:                    { name: 'Alien blaster',                damageMin: 20, damageMax: 25 },
  AlienBlaster_Destabilizer:       { name: 'Destabilizer',                 damageMin: 26, damageMax: 32 },
  InstitutePistol:                 { name: 'Institute pistol',             damageMin: 13, damageMax: 18 },
  LaserPistol_Rusty:               { name: 'Rusty laser pistol',           damageMin:  7, damageMax: 11 },
  LaserPistol:                     { name: 'Laser pistol',                 damageMin:  9, damageMax: 14 },
  LaserPistol_Focused:             { name: 'Focused laser pistol',         damageMin: 12, damageMax: 17 },
  LaserPistol_SmugglersEnd:        { name: "Smuggler's End",               damageMin: 16, damageMax: 21 },
  PlasmaPistol:                    { name: 'Plasma pistol',                damageMin: 12, damageMax: 17 },
  PlasmaPistol_Focused:            { name: 'Focused plasma pistol',        damageMin: 16, damageMax: 21 },
  PlasmaPistol_MPXLNovasurge:      { name: 'MPXL Novasurge',              damageMin: 22, damageMax: 28 },

  // ── Rifles ───────────────────────────────────────────────────────────────────
  // Generic "Rifle_Rusty" save-string (not in community name map — assign a sensible display name)
  Rifle_Rusty:                     { name: 'Rusty rifle',                  damageMin:  7, damageMax: 11 },
  // Assault rifle family
  AssaultRifle_Rusty:              { name: 'Rusty assault rifle',          damageMin:  9, damageMax: 14 },
  AssaultRifle:                    { name: 'Assault rifle',                damageMin: 13, damageMax: 18 },
  AssaultRifle_Enhanced:           { name: 'Enhanced assault rifle',       damageMin: 17, damageMax: 22 },
  AssaultRifle_Hardened:           { name: 'Hardened assault rifle',       damageMin: 21, damageMax: 27 },
  AssaultRifle_Infiltrator:        { name: 'Infiltrator',                  damageMin: 25, damageMax: 31 },
  // BB gun family
  BBGun_Rusty:                     { name: 'Rusty BB gun',                 damageMin:  3, damageMax:  6 },
  BBGun:                           { name: 'BB gun',                       damageMin:  4, damageMax:  8 },
  BBGun_Enhanced:                  { name: 'Enhanced BB gun',              damageMin:  5, damageMax:  9 },
  BBGun_Hardened:                  { name: 'Hardened BB gun',              damageMin:  6, damageMax: 10 },
  BBGun_RedRocket:                 { name: 'Red Rocket',                   damageMin:  8, damageMax: 13 },
  // Gauss rifle family
  GaussRifle_Rusty:                { name: 'Rusty Gauss rifle',            damageMin: 13, damageMax: 18 },
  GaussRifle:                      { name: 'Gauss rifle',                  damageMin: 16, damageMax: 22 },
  GaussRifle_Enhanced:             { name: 'Enhanced Gauss rifle',         damageMin: 20, damageMax: 26 },
  GaussRifle_Hardened:             { name: 'Hardened Gauss rifle',         damageMin: 24, damageMax: 31 },
  GaussRifle_Magnetron4000:        { name: 'Magnetron 4000',               damageMin: 28, damageMax: 35 },
  // Hunting rifle family
  HuntingRifle_Rusty:              { name: 'Rusty hunting rifle',          damageMin:  8, damageMax: 12 },
  HuntingRifle:                    { name: 'Hunting rifle',                damageMin: 11, damageMax: 15 },
  HuntingRifle_Enhanced:           { name: 'Enhanced hunting rifle',       damageMin: 14, damageMax: 19 },
  HuntingRifle_Hardened:           { name: 'Hardened hunting rifle',       damageMin: 18, damageMax: 23 },
  HuntingRifle_OlPainless:         { name: "Ol' Painless",                 damageMin: 22, damageMax: 27 },
  // Lever-action / special rifles
  LeverActionRifle:                { name: 'Lever-action rifle',           damageMin: 13, damageMax: 18 },
  LeverActionRifle_LincolnsRepeater: { name: "Lincoln's repeater",         damageMin: 20, damageMax: 26 },
  // Pipe rifle family
  PipeRifle:                       { name: 'Pipe rifle',                   damageMin:  7, damageMax: 11 },
  PipeRifle_Calibrated:            { name: 'Calibrated pipe rifle',        damageMin:  9, damageMax: 13 },
  PipeRifle_Bayoneted:             { name: 'Bayoneted pipe rifle',         damageMin:  9, damageMax: 13 },
  PipeRifle_BigSister:             { name: 'Big Sister',                   damageMin: 14, damageMax: 19 },
  // Railway / sniper
  RailwayRifle:                    { name: 'Railway rifle',                damageMin: 15, damageMax: 20 },
  RailwayRifle_Railmaster:         { name: 'Railmaster',                   damageMin: 20, damageMax: 26 },
  SniperRifle:                     { name: 'Sniper rifle',                 damageMin: 15, damageMax: 20 },
  SniperRifle_Enhanced:            { name: 'Enhanced sniper rifle',        damageMin: 19, damageMax: 25 },
  SniperRifle_Victory:             { name: 'Victory rifle',                damageMin: 24, damageMax: 30 },
  // Energy rifles
  InstituteRifle:                  { name: 'Institute rifle',              damageMin: 17, damageMax: 22 },
  InstituteRifle_Excited:          { name: 'Excited Institute rifle',      damageMin: 21, damageMax: 27 },
  InstituteRifle_Virgils:          { name: "Virgil's rifle",               damageMin: 25, damageMax: 32 },
  LaserRifle:                      { name: 'Laser rifle',                  damageMin: 13, damageMax: 18 },
  LaserRifle_Amplified:            { name: 'Amplified laser rifle',        damageMin: 17, damageMax: 22 },
  LaserRifle_Focused:              { name: 'Focused laser rifle',          damageMin: 17, damageMax: 22 },
  LaserRifle_WazerWifle:           { name: 'Wazer Wifle',                  damageMin: 22, damageMax: 28 },
  PlasmaRifle:                     { name: 'Plasma rifle',                 damageMin: 17, damageMax: 23 },
  PlasmaRifle_Focused:             { name: 'Focused plasma rifle',         damageMin: 21, damageMax: 28 },
  PlasmaRifle_MeanGreenMonster:    { name: 'Mean Green Monster',           damageMin: 26, damageMax: 33 },
  PlasmaThrower:                   { name: 'Plasma thrower',               damageMin: 21, damageMax: 27 },
  PlasmaThrower_Boosted:           { name: 'Boosted plasma thrower',       damageMin: 25, damageMax: 32 },
  PlasmaThrower_DragonsMaw:        { name: "Dragon's Maw",                 damageMin: 30, damageMax: 38 },

  // ── Shotguns ─────────────────────────────────────────────────────────────────
  CombatShotgun:                   { name: 'Combat shotgun',               damageMin: 15, damageMax: 21 },
  CombatShotgun_Enhanced:          { name: 'Enhanced combat shotgun',      damageMin: 19, damageMax: 26 },
  CombatShotgun_Charons:           { name: "Charon's shotgun",             damageMin: 24, damageMax: 31 },
  SawedOffShotgun:                 { name: 'Sawed-off shotgun',            damageMin: 11, damageMax: 16 },
  SawedOffShotgun_Kneecapper:      { name: 'Kneecapper',                   damageMin: 16, damageMax: 22 },
  Shotgun:                         { name: 'Shotgun',                      damageMin:  9, damageMax: 13 },
  Shotgun_DoubleBarrel:            { name: 'Double-barrel shotgun',        damageMin: 13, damageMax: 18 },
  Shotgun_FarmersDaughter:         { name: "Farmer's Daughter",            damageMin: 18, damageMax: 24 },

  // ── Heavy weapons ─────────────────────────────────────────────────────────────
  FatMan:                          { name: 'Fat Man',                      damageMin: 40, damageMax: 50 },
  FatMan_MIRV:                     { name: 'MIRV',                         damageMin: 55, damageMax: 70 },
  Flamer:                          { name: 'Flamer',                       damageMin: 21, damageMax: 27 },
  Flamer_Burnmaster:               { name: 'Burnmaster',                   damageMin: 26, damageMax: 33 },
  GatlingLaser:                    { name: 'Gatling laser',                damageMin: 21, damageMax: 27 },
  GatlingLaser_Focused:            { name: 'Focused Gatling laser',        damageMin: 26, damageMax: 33 },
  GatlingLaser_Vengeance:          { name: 'Vengeance',                    damageMin: 32, damageMax: 40 },
  JunkJet:                         { name: 'Junk Jet',                     damageMin: 17, damageMax: 23 },
  JunkJet_Flaming:                 { name: 'Flaming Junk Jet',             damageMin: 21, damageMax: 28 },
  Minigun:                         { name: 'Minigun',                      damageMin: 17, damageMax: 23 },
  Minigun_LeadBelcher:             { name: 'Lead Belcher',                 damageMin: 22, damageMax: 29 },
  MissileLauncher:                 { name: 'Missile launcher',             damageMin: 33, damageMax: 42 },

  // ── Railgun (not in community name map — documented in game data) ─────────────
  Railgun:                         { name: 'Railgun',                      damageMin: 18, damageMax: 22 },
};
