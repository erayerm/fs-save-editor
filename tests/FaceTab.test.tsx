import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaceTab } from '../src/components/editor/FaceTab';
import type { SpriteIndex } from '../src/types/pieces';

// The thumbnail effect loads the mesh set and renders offscreen. Keep it inert
// in tests (never resolves) so we only exercise the option-grid behavior.
vi.mock('../src/lib/meshLoader', () => ({
  loadMeshSet: () => new Promise(() => {}),
  _resetMeshCache: vi.fn(),
}));
vi.mock('../src/lib/dwellerWebGL', () => ({
  createDwellerRenderer: () => ({ draw: vi.fn(), dispose: vi.fn() }),
}));
vi.mock('../src/lib/atlasLoader', () => ({
  loadAtlas: () => Promise.resolve({} as unknown),
}));

const fm = (name: string, gender: 'male' | 'female' | 'any') => ({
  guid: name + gender, name, atlas: 'a.png',
  bounds: { x: 0, y: 0, w: 1, h: 1 }, gender, flags: {},
});

const idx: SpriteIndex = {
  version: 1,
  byType: {
    hair: [], body: [], outfit: [], outfitColoringMask: [], face: [],
    faceMask: [
      fm('f_hair_11', 'male'),
      fm('glasses', 'male'),
      fm('wrinkles', 'male'),
      fm('monocle', 'female'), // female-only: excluded for a male dweller
    ],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
} as unknown as SpriteIndex;

describe('FaceTab', () => {
  it('lists faceMask options across categories plus None, excluding other-gender pieces', () => {
    render(
      <FaceTab index={idx} dweller={{ gender: 2, facialHair: 'f_hair_11' }} onChange={vi.fn()} />,
    );
    expect(screen.getByTitle('None')).toBeTruthy();
    expect(screen.getByTitle('f_hair_11')).toBeTruthy();
    expect(screen.getByTitle('glasses')).toBeTruthy();
    expect(screen.getByTitle('wrinkles')).toBeTruthy();
    expect(screen.queryByTitle('monocle')).toBeNull();
  });

  it('renders category headings', () => {
    render(
      <FaceTab index={idx} dweller={{ gender: 2, facialHair: undefined }} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Facial Hair')).toBeTruthy();
    expect(screen.getByText('Glasses')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('calls onChange with the selected piece', () => {
    const onChange = vi.fn();
    render(
      <FaceTab index={idx} dweller={{ gender: 2, facialHair: undefined }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTitle('glasses'));
    expect(onChange).toHaveBeenCalledWith({ facialHair: 'glasses' });
  });

  it('calls onChange with null when None is selected', () => {
    const onChange = vi.fn();
    render(
      <FaceTab index={idx} dweller={{ gender: 2, facialHair: 'f_hair_11' }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTitle('None'));
    expect(onChange).toHaveBeenCalledWith({ facialHair: null });
  });
});
