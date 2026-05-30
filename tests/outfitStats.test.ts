import { describe, it, expect } from 'vitest';
import { specialBonusFor } from '../src/lib/outfitStats';

describe('specialBonusFor', () => {
  it('returns correct bonus for BattleArmor', () => {
    expect(specialBonusFor('BattleArmor')).toEqual({ S: 3 });
  });

  it('returns correct bonus for LabCoat', () => {
    expect(specialBonusFor('LabCoat')).toEqual({ I: 2 });
  });

  it('returns correct bonus for CombatArmor', () => {
    expect(specialBonusFor('CombatArmor')).toEqual({ E: 3 });
  });

  it('returns correct bonus for HazmatSuit', () => {
    expect(specialBonusFor('HazmatSuit')).toEqual({ E: 7 });
  });

  it('returns {} for jumpsuit (no bonus)', () => {
    expect(specialBonusFor('jumpsuit')).toEqual({});
  });

  it('returns {} for unknown id', () => {
    expect(specialBonusFor('nonexistent_outfit_xyz')).toEqual({});
  });

  it('returns multi-stat bonus for PowerArmor', () => {
    const bonus = specialBonusFor('PowerArmor');
    expect(bonus.S).toBeGreaterThan(0);
    expect(bonus.E).toBeGreaterThan(0);
  });

  it('returns correct bonus for MetalArmor', () => {
    expect(specialBonusFor('MetalArmor')).toEqual({ S: 2, E: 2 });
  });

  it('returns correct bonus for ScientistScrubs', () => {
    expect(specialBonusFor('ScientistScrubs')).toEqual({ I: 3 });
  });

  it('returns correct bonus for GamblerSuit', () => {
    expect(specialBonusFor('GamblerSuit')).toEqual({ L: 3 });
  });
});
