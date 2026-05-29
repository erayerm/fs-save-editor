import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPalette } from '../src/components/editor/ColorPalette';

describe('ColorPalette', () => {
  it('fires onChange with the chosen swatch rgb', () => {
    const onChange = vi.fn();
    render(
      <ColorPalette
        label="Hair"
        value={{ r: 0, g: 0, b: 0 }}
        swatches={[{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }]}
        onChange={onChange}
      />,
    );
    // Click the second swatch (green, index 1) = aria-label "Hair swatch 1"
    fireEvent.click(screen.getByLabelText('Hair swatch 1'));
    expect(onChange).toHaveBeenCalledWith({ r: 0, g: 255, b: 0 });
  });
});
