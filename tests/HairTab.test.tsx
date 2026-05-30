import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HairTab } from '../src/components/editor/HairTab';
import type { SpriteIndex } from '../src/types/pieces';

// loadMeshSet is mockable per-test. By default it never resolves so the
// original "shows only same-gender hairs" test keeps thumbnails empty.
const loadMeshSetMock = vi.fn<[], Promise<unknown>>(() => new Promise(() => {}));
vi.mock('../src/lib/meshLoader', () => ({
  loadMeshSet: () => loadMeshSetMock(),
  _resetMeshCache: vi.fn(),
}));

// Renderer mock — lets us count draw() calls (one per hair piece per rebuild).
const drawMock = vi.fn();
vi.mock('../src/lib/dwellerWebGL', () => ({
  createDwellerRenderer: () => ({ draw: drawMock, dispose: vi.fn() }),
}));

// buildLayers returns a single body layer with a triMask so it passes HairTab's
// filter and triggers a draw().
vi.mock('../src/lib/dwellerLayers', () => ({
  buildLayers: () => [{ slot: 'body', atlas: 'a.png', triMask: [0] }],
}));

vi.mock('../src/lib/atlasLoader', () => ({
  loadAtlas: () => Promise.resolve({} as unknown),
}));

const meshGeom = { positions: [], uvs: [], uvs1: [], indices: [] };
const meshSetStub = {
  version: 1,
  atlasSize: 1024,
  male: { offsets: { hand: [0, 0], face: [0, 0] }, adult: meshGeom, child: meshGeom },
  female: { offsets: { hand: [0, 0], face: [0, 0] }, adult: meshGeom, child: meshGeom },
};

const idx: SpriteIndex = {
  version: 1,
  byType: {
    hair: [
      { guid: 'h1', name: '16', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'male', flags: {} },
      { guid: 'h2', name: '21', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'female', flags: {} },
    ],
    body: [], outfit: [], outfitColoringMask: [], face: [], faceMask: [],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
};

describe('HairTab', () => {
  beforeEach(() => {
    drawMock.mockClear();
    loadMeshSetMock.mockReset();
    loadMeshSetMock.mockImplementation(() => new Promise(() => {}));
  });

  it('shows only same-gender hairs and calls onChange on select', () => {
    const onChange = vi.fn();
    render(
      <HairTab
        index={idx}
        dweller={{ gender: 2, hairName: '16', hairColor: { r: 0, g: 0, b: 0 } }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByTitle('21')).toBeNull(); // female hair hidden for male
    fireEvent.click(screen.getByTitle('16'));
    expect(onChange).toHaveBeenCalledWith({ hair: '16' });
  });

  it('debounces color-driven thumbnail rebuilds (no rebuild until delay elapses)', async () => {
    vi.useFakeTimers();
    loadMeshSetMock.mockResolvedValue(meshSetStub);

    let color = { r: 0, g: 0, b: 0 };
    const Wrapper = ({ c }: { c: { r: number; g: number; b: number } }) => (
      <HairTab
        index={idx}
        dweller={{ gender: 2, hairName: '16', hairColor: c }}
        onChange={vi.fn()}
      />
    );

    const { rerender } = render(<Wrapper c={color} />);

    // Flush meshSet load + initial async thumbnail build (one draw per hair piece).
    await act(async () => { await vi.runAllTimersAsync(); });
    const initialDraws = drawMock.mock.calls.length;
    expect(initialDraws).toBeGreaterThan(0);

    // Rapidly change hairColor three times within the 250ms debounce window.
    drawMock.mockClear();
    for (const next of [
      { r: 10, g: 0, b: 0 },
      { r: 20, g: 0, b: 0 },
      { r: 30, g: 0, b: 0 },
    ]) {
      color = next;
      rerender(<Wrapper c={color} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    }

    // 150ms total elapsed (< 250ms): the thumbnail grid must NOT have rebuilt.
    expect(drawMock).not.toHaveBeenCalled();

    // Advance past the debounce delay → exactly one rebuild now fires.
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(drawMock.mock.calls.length).toBe(initialDraws);

    vi.useRealTimers();
  });
});
