import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialBadges } from '../src/components/editor/SpecialBadges';

describe('SpecialBadges', () => {
  it('renders badges for each stat in SPECIAL order', () => {
    render(<SpecialBadges bonus={{ S: 3, A: 2 }} />);
    const badges = screen.getAllByText(/[SPECIAL]/);
    // S comes before A in SPECIAL order
    const texts = screen.getAllByTitle(/\+\d/).map((el) => el.getAttribute('title'));
    expect(texts[0]).toMatch(/^Strength \(S\)\n\+3 while worn\n/);
    expect(texts[1]).toMatch(/^Agility \(A\)\n\+2 while worn\n/);
  });

  it('explains the stat in the tooltip', () => {
    render(<SpecialBadges bonus={{ P: 1 }} />);
    expect(screen.getByTitle(/Perception/).getAttribute('title')).toBe([
      'Perception (P)',
      '+1 while worn',
      'Works in: Water Treatment, Water Purification',
      'Trained in: Armory',
      'Speeds up water production and helps land critical hits.',
    ].join('\n'));
  });

  it('renders nothing when bonus is empty', () => {
    const { container } = render(<SpecialBadges bonus={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the correct letter and value', () => {
    render(<SpecialBadges bonus={{ I: 5 }} />);
    expect(screen.getByTitle(/^Intelligence \(I\)\s\+5 while worn/)).toBeTruthy();
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
  });
});
