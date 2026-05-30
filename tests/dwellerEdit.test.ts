import { describe, it, expect } from 'vitest';
import { applyCustomization } from '../src/lib/dwellerEdit';

describe('applyCustomization facialHair', () => {
  it('sets the facial hair field (save key "faceMask") without disturbing other fields', () => {
    const d = { serializeId: 1, name: 'Bob', lastName: 'X', gender: 2 } as any;
    const next = applyCustomization(d, { facialHair: 'f_hair_11' });
    expect((next as any).faceMask).toBe('f_hair_11');
    expect(next.name).toBe('Bob');
  });

  it('clears the facial hair field when set to null', () => {
    const d = { serializeId: 1, name: 'Bob', lastName: 'X', gender: 2, faceMask: 'f_hair_11' } as any;
    const next = applyCustomization(d, { facialHair: null });
    expect((next as any).faceMask).toBeNull();
    expect(next.name).toBe('Bob');
  });
});
