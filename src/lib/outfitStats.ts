export type Special = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

/**
 * Maps outfit piece names (as they appear in the sprite index) to their
 * SPECIAL stat bonuses. Values sourced from known Fallout Shelter game data.
 * Outfits not listed here grant no bonus.
 */
export const OUTFIT_SPECIAL: Record<string, Partial<Record<Special, number>>> = {
  // Strength outfits
  BattleArmor: { S: 3 },
  RaiderArmor: { S: 2 },
  robot_armor: { S: 3, E: 3 },
  WandererArmor: { S: 3 },
  ScarredPowerArmor: { S: 5, E: 5 },

  // Perception outfits
  HunterGear: { P: 3 },
  MilitaryJumpsuit: { P: 2 },
  NinjaSuit: { P: 3, A: 3 },
  RiotGear: { P: 3, E: 3 },
  ncr_ranger: { P: 4, E: 2 },
  ncr_ranger_Helmetless: { P: 4, E: 2 },

  // Endurance outfits
  CombatArmor: { E: 3 },
  HazmatSuit: { E: 7 },
  RadiationSuit: { E: 3 },
  MetalArmor: { S: 2, E: 2 },
  MetalArmorRaiderBoss: { S: 3, E: 3 },
  synth_armor: { E: 3, I: 2 },

  // Charisma outfits
  BusinessSuit: { C: 2 },
  BusinessDress: { C: 2 },
  SleekSuit: { C: 3 },
  WeddingDress: { C: 3 },
  ActionWeddingDress: { C: 3 },
  SequinDress: { C: 3 },
  PolkaDotDress: { C: 2 },
  SwingDress: { C: 2 },
  LuckyYellowDress: { C: 2 },
  SodaFountainDress: { C: 2 },
  WorkDress: { C: 1 },
  TiedBlouse: { C: 1 },
  WaitressUniform: { C: 1 },
  DooWopOutfit: { C: 2 },
  LoungeShirt: { C: 1 },
  SleazySuit: { C: 2 },

  // Intelligence outfits
  LabCoat: { I: 2 },
  ScientistScrubs: { I: 3 },
  WastelandSurgeon: { I: 3 },
  ScribeRobe: { I: 2 },
  ScribeRobeLegen: { I: 4 },
  EngineerFemaleSpecial: { I: 3 },
  robco_rd_suit: { I: 3, P: 2 },
  robco_rd_suit_Helmetless: { I: 3, P: 2 },
  robco_rd_suit_Heltmetless: { I: 3, P: 2 },
  robco_factory_uniform: { I: 2 },
  institute_jumpsuit: { I: 2 },

  // Agility outfits
  FlightSuit: { A: 2 },
  CheckeredShirt: { A: 1 },
  JacketTshirt: { A: 1 },
  BOSCasual: { A: 2 },
  ArgyleSweater: { A: 1 },
  SweaterVest: { A: 1 },
  Suspenders: { A: 1 },
  Vest: { A: 1 },

  // Luck outfits
  GamblerSuit: { L: 3 },
  AllNighware: { L: 3 },
  PrewarCowboy: { L: 2 },
  BowlingShirt: { L: 2 },
  BaseballUniform: { L: 2 },

  // Power Armors (multi-stat)
  PowerArmor: { S: 4, E: 4 },
  PowerArmorSpecial: { S: 5, E: 5 },
  PowerArmor_51: { S: 5, E: 5 },
  PowerArmor_60: { S: 5, E: 5 },
  PowerArmor_X1: { S: 5, E: 5 },
  HanksPowerArmor: { S: 5, E: 5 },
  EnclavePowerArmor: { S: 5, E: 5 },
  NCRPowerArmor: { S: 4, E: 4 },
  PaladinDanse_T60: { S: 5, E: 5 },
  PaladinDanse_T60_WithHelmet: { S: 5, E: 5 },

  // BOS outfits
  BOS_Uniform: { P: 2, E: 1 },
  BOS_Uniform_Advanced: { P: 2, E: 2 },
  BOS_Uniform_Expert: { P: 3, E: 2 },
  'BOS Paladin': { S: 3, E: 3 },

  // Vault suits (no bonus — listed explicitly for clarity but {} is default)
  // jumpsuit: {},
  // VaultSuit: {},
  // Vault33Suit: {},
  // LucysVaultSuit: {},

  // Misc armor
  Kellogg_Armor: { S: 3, E: 2 },
  Claff_Armor: { S: 2 },
  MoldaversArmor: { S: 2, E: 2 },
  Courser: { S: 2, P: 2 },
  Gen2Synth: { S: 1, E: 1 },
  EnclaveOfficerUniform: { P: 2, C: 2 },
  EnclaveOfficerUniform_Helmetless: { P: 2, C: 2 },
  EnclaveSecurityOutfit: { P: 2, E: 2 },
  EnclaveSecurityOutfit_Helmetless: { P: 2, E: 2 },

  // Misc
  HandymanJumpsuit: { I: 1 },
  MechanicJumpsuit: { I: 2 },
  UtilityJumpsuit: { E: 1 },
  VaultSecurityOutfit: { P: 2 },
  farharbor: { S: 2, E: 2 },
  alien_space_suit: { I: 3, P: 2 },
  Alien_Space_Suit_F: { I: 3, P: 2 },
  alien_space_suit_enemy: { I: 3, P: 2 },
  ScifiSpecial: { I: 3 },
  HazmatSuit_Advanced: { E: 7 },
  MojaveWastelandSurvivor: { E: 2, A: 2 },
  NickValentine_TrenchCoat: { P: 2, C: 2 },
  GhoulKing: { C: 2 },
  LibrarianFemaleSpecial: { I: 3, C: 2 },
  ProfessorSpecial: { I: 4 },
  MoviefanFemaleSpecial: { C: 3 },
  SurgeonFemaleSpecial: { I: 3 },
  SoldierFemaleSpecial: { S: 3, E: 2 },
  SportsfanSpecial: { S: 2, L: 2 },
  GreaserMaleSpecial: { C: 2, L: 2 },
  ComedianMaleSpecial: { C: 3 },
  WrestlerSpecial: { S: 4 },
  SlasherSpecial: { S: 3 },
  KnightSpecial: { S: 3, E: 3 },
  SurvivorSpecial: { E: 3 },
  PowerArmorSpecial_2: { S: 5, E: 5 },
  Empress: { C: 4 },
  Prince: { C: 3 },
  King: { C: 3 },
  Bishop: { I: 2, C: 2 },
  MaJuneJacket: { L: 2 },
  WilzigsTravelwear: { P: 2 },
  OrionMoreno_Outfit: { E: 3 },
  'Maximus Coat': { S: 2, E: 2 },
  'Mr House': { C: 3, I: 2 },
  Preston: { P: 2, C: 2 },
  PiperSpecial: { P: 3, C: 2 },
  Cromwell: { C: 2 },
  Lucas: { S: 2 },
  MayorSpecial: { C: 4 },
  MrBurkeSpecial: { C: 3, I: 2 },
  Legate: { S: 4, E: 4 },
  Incognito: { A: 3 },
  Incognito_Female: { A: 3 },
};

export function specialBonusFor(outfitId: string): Partial<Record<Special, number>> {
  return OUTFIT_SPECIAL[outfitId] ?? {};
}
