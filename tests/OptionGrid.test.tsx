import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionGrid } from '../src/components/editor/OptionGrid';

describe('OptionGrid', () => {
  it('renders options and fires onSelect with the value', () => {
    const onSelect = vi.fn();
    render(
      <OptionGrid
        options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]}
        selected="a"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('Beta'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('marks the selected option with aria-pressed=true', () => {
    render(
      <OptionGrid options={[{ value: 'a', label: 'Alpha' }]} selected="a" onSelect={() => {}} />,
    );
    expect(screen.getByText('Alpha').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('pins favorites to the front and toggles via the marker', () => {
    const onToggleFavorite = vi.fn();
    render(
      <OptionGrid
        options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }]}
        selected={null}
        onSelect={() => {}}
        favorites={['c']}
        onToggleFavorite={onToggleFavorite}
      />,
    );
    const labels = screen.getAllByText(/Alpha|Beta|Gamma/).map((n) => n.textContent);
    expect(labels[0]).toBe('Gamma');

    const marker = screen.getAllByRole('button', { name: /favorites/i })[0];
    fireEvent.click(marker);
    expect(onToggleFavorite).toHaveBeenCalledWith('c');
  });
});
