import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWeaponIndex, weaponById, _resetWeaponCache } from '../src/lib/weaponIndex';
import type { WeaponIndex } from '../src/types/weapons';

const FAKE_INDEX: WeaponIndex = {
  version: 1,
  weapons: {
    Railgun:            { name: 'Railgun',  damageMin: 18, damageMax: 22, icon: '' },
    HuntingRifle_Rusty: { name: 'Rusty hunting rifle', damageMin: 8, damageMax: 12, icon: '' },
  },
};

describe('loadWeaponIndex', () => {
  beforeEach(() => _resetWeaponCache());

  it('fetches and resolves the weapon index', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => FAKE_INDEX });
    vi.stubGlobal('fetch', fetchMock);
    const idx = await loadWeaponIndex();
    expect(idx.version).toBe(1);
    expect(idx.weapons['Railgun'].name).toBe('Railgun');
  });

  it('caches — second call does not re-fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => FAKE_INDEX });
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadWeaponIndex();
    const b = await loadWeaponIndex();
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadWeaponIndex()).rejects.toThrow(/weapon index/);
  });
});

describe('weaponById', () => {
  it('returns meta for known id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => FAKE_INDEX });
    vi.stubGlobal('fetch', fetchMock);
    const idx = await loadWeaponIndex();
    const meta = weaponById(idx, 'Railgun');
    expect(meta).toMatchObject({ name: 'Railgun', damageMin: 18, damageMax: 22, icon: '' });
  });

  it('returns null for unknown id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => FAKE_INDEX });
    vi.stubGlobal('fetch', fetchMock);
    const idx = await loadWeaponIndex();
    expect(weaponById(idx, 'UnknownWeapon')).toBeNull();
  });
});
