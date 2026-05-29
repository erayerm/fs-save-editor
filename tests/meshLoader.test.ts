import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadMeshSet, _resetMeshCache } from '../src/lib/meshLoader';

describe('loadMeshSet', () => {
  beforeEach(() => _resetMeshCache());

  it('fetches once and caches', async () => {
    const fake = { version: 1, atlasSize: 1024, male: {}, female: {} };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fake });
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadMeshSet();
    const b = await loadMeshSet();
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadMeshSet()).rejects.toThrow(/meshes\.json/);
  });
});
