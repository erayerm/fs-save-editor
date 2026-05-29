import { describe, it, expect } from 'vitest';
import { createDwellerRenderer } from '../src/lib/dwellerWebGL';

describe('createDwellerRenderer', () => {
  it('throws a clear error when WebGL is unavailable', () => {
    const fakeCanvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => createDwellerRenderer(fakeCanvas)).toThrow(/WebGL/);
  });
});
