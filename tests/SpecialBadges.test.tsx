import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialBadges } from '../src/components/editor/SpecialBadges';

describe('SpecialBadges', () => {
  it('renders badges for each stat in SPECIAL order', () => {
    render(<SpecialBadges bonus={{ S: 3, A: 2 }} />);
    const badges = screen.getAllByText(/[SPECIAL]/);
    // S comes before A in SPECIAL order
    const texts = screen.getAllByTitle(/\+\d/).map((el) => el.getAttribute('title'));
    expect(texts[0]).toBe('S +3');
    expect(texts[1]).toBe('A +2');
  });

  it('renders nothing when bonus is empty', () => {
    const { container } = render(<SpecialBadges bonus={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the correct letter and value', () => {
    render(<SpecialBadges bonus={{ I: 5 }} />);
    expect(screen.getByTitle('I +5')).toBeTruthy();
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
  });
});
