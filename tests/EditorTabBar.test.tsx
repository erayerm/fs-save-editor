import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTabBar } from '../src/components/editor/EditorTabBar';

describe('EditorTabBar', () => {
  it('renders tabs and fires onSelect', () => {
    const onSelect = vi.fn();
    render(
      <EditorTabBar
        tabs={[{ id: 'hair', label: 'Hair' }, { id: 'outfit', label: 'Outfit' }]}
        active="hair"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('Outfit'));
    expect(onSelect).toHaveBeenCalledWith('outfit');
  });
});
