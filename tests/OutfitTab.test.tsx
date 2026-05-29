import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutfitTab } from '../src/components/editor/OutfitTab';
import type { SpriteIndex } from '../src/types/pieces';

const idx: SpriteIndex = {
  version: 1,
  byType: {
    outfit: [
      { guid: 'o1', name: 'jumpsuit', atlas: 'a.png', bounds: { x: 0, y: 0, w: 1, h: 1 }, gender: 'male', flags: {} },
    ],
    hair: [], body: [], outfitColoringMask: [], face: [], faceMask: [],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
};

describe('OutfitTab', () => {
  it('updates outfitId on select', () => {
    const onChange = vi.fn();
    render(
      <OutfitTab
        index={idx}
        dweller={{ gender: 2, outfitName: 'jumpsuit', outfitColor: { r: 0, g: 0, b: 0 }, skinColor: { r: 0, g: 0, b: 0 } }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('jumpsuit'));
    expect(onChange).toHaveBeenCalledWith({ outfitId: 'jumpsuit' });
  });
});
