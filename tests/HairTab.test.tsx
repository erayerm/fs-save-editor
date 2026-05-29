import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HairTab } from '../src/components/editor/HairTab';
import type { SpriteIndex } from '../src/types/pieces';

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
  it('shows only same-gender hairs and calls onChange on select', () => {
    const onChange = vi.fn();
    render(
      <HairTab
        index={idx}
        dweller={{ gender: 2, hairName: '16', hairColor: { r: 0, g: 0, b: 0 } }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText('21')).toBeNull(); // female hair hidden for male
    fireEvent.click(screen.getByText('16'));
    expect(onChange).toHaveBeenCalledWith({ hair: '16' });
  });
});
