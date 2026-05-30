import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacialHairTab } from '../src/components/editor/FacialHairTab';
import type { SpriteIndex } from '../src/types/pieces';

const idx: SpriteIndex = {
  version: 1,
  byType: {
    hair: [],
    body: [], outfit: [], outfitColoringMask: [], face: [],
    faceMask: [
      { guid: 'fm1', name: 'f_hair_11', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'male', flags: {} },
      { guid: 'fm2', name: 'Kellogg_beard', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'male', flags: {} },
      // Not facial hair (a decoration): must NOT appear.
      { guid: 'fm3', name: 'glasses', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'male', flags: {} },
      // Female piece: must NOT appear for a male dweller.
      { guid: 'fm4', name: 'makeup', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'female', flags: {} },
    ],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
};

describe('FacialHairTab', () => {
  it('lists facial-hair options plus a "None" choice and excludes decorations', () => {
    render(
      <FacialHairTab
        index={idx}
        dweller={{ gender: 2, facialHair: 'f_hair_11' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle('f_hair_11')).toBeTruthy();
    expect(screen.getByTitle('Kellogg_beard')).toBeTruthy();
    expect(screen.getByTitle('None')).toBeTruthy();
    expect(screen.queryByTitle('glasses')).toBeNull();
    expect(screen.queryByTitle('makeup')).toBeNull();
  });

  it('calls onChange with the selected facialHair', () => {
    const onChange = vi.fn();
    render(
      <FacialHairTab
        index={idx}
        dweller={{ gender: 2, facialHair: undefined }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle('Kellogg_beard'));
    expect(onChange).toHaveBeenCalledWith({ facialHair: 'Kellogg_beard' });
  });

  it('calls onChange with null when None is selected', () => {
    const onChange = vi.fn();
    render(
      <FacialHairTab
        index={idx}
        dweller={{ gender: 2, facialHair: 'f_hair_11' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle('None'));
    expect(onChange).toHaveBeenCalledWith({ facialHair: null });
  });
});
