import { describe, it, expect } from 'vitest';
import { computeDwellerStats, hpPerLevel, maxHpAt, petBonusLabel } from './dwellerStats';
import type { Dweller } from '../types/save';

const mk = (over: Record<string, unknown> = {}): Dweller => ({
  serializeId: 1, name: 'A', lastName: 'B', gender: 1,
  experience: { currentLevel: 10 },
  stats: { stats: [{ value: 0, mod: 0, exp: 0 }, ...[5, 4, 3, 2, 1, 6, 7].map((value) => ({ value, mod: 0, exp: 0 }))] },
  health: { healthValue: 150, maxHealth: 160, radiationValue: 0 },
  ...over,
} as unknown as Dweller);

describe('HP formulas', () => {
  it('gives 252 HP at level 50 with END 1 and 644 with END 17', () => {
    expect(maxHpAt(50, 1)).toBe(252);
    expect(maxHpAt(50, 17)).toBe(644);
  });
  it('caps Endurance at 17 when computing HP per level', () => {
    expect(hpPerLevel(20)).toBe(11);
  });
});

describe('computeDwellerStats', () => {
  it('adds outfit bonuses to SPECIAL and uses total Endurance for HP per level', () => {
    const s = computeDwellerStats(mk(), { E: 4 });
    const e = s.special.find((r) => r.letter === 'E')!;
    expect(e).toMatchObject({ base: 3, outfit: 4, total: 7 });
    expect(s.health.perLevel).toBe(6);
    expect(s.health.projectedMax).toBe(160 + 40 * 6);
    expect(s.health.radImmune).toBe(false);
  });

  it('applies pet Health and Damage bonuses from the equipped pet', () => {
    const hpPet = computeDwellerStats(mk({ equippedPet: { id: 'x', extraData: { bonus: 'AddMaxHP', bonusValue: 100 } } }), {});
    expect(hpPet.health.petMultiplier).toBe(2);
    const dmgPet = computeDwellerStats(mk({ equippedPet: { id: 'y', extraData: { bonus: 'DamageBoost', bonusValue: 4 } } }), {});
    expect(dmgPet.petDamage).toBe(4);
    expect(dmgPet.pet?.label).toBe('+4 Damage');
  });

  it('labels unknown pet bonuses with their raw name', () => {
    expect(petBonusLabel('SomethingNew', 5)).toBe('SomethingNew 5');
  });
});
