import { describe, it, expect } from 'vitest';
import { parseEBonusEffect } from './parseEBonusEffect.mjs';

const SAMPLE = `public enum EBonusEffect
{
\tNone = 1,
\tDamageBoost = 1048576,
\tObjectiveMultiplier = 536870912,
\tResistance = int.MinValue,
\tChildMultiplier = -2147483647,
}`;

describe('parseEBonusEffect', () => {
  it('maps positive int values to enum names', () => {
    const m = parseEBonusEffect(SAMPLE);
    expect(m.get(1048576)).toBe('DamageBoost');
    expect(m.get(536870912)).toBe('ObjectiveMultiplier');
  });
  it('handles negative and int.MinValue members', () => {
    const m = parseEBonusEffect(SAMPLE);
    expect(m.get(-2147483648)).toBe('Resistance');
    expect(m.get(-2147483647)).toBe('ChildMultiplier');
  });
});
