import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPetIndex, _resetPetCache } from './petIndex';

const INDEX = { version: 1, pets: { germanshepherd_l: { id: 'germanshepherd_l', name: 'German Shepherd', type: 'Dog', breed: 'German Shepherd', rarity: 'Legendary', bonus: 'ObjectiveMultiplier', bonusValue: 3, bonusLabel: 'ObjectiveMultiplier +3', uniqueName: 'Dogmeat', icon: null } } };

describe('loadPetIndex', () => {
  beforeEach(() => { _resetPetCache(); });
  it('fetches and caches the pet index', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INDEX) });
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadPetIndex();
    const b = await loadPetIndex();
    expect(a.pets.germanshepherd_l.bonus).toBe('ObjectiveMultiplier');
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
