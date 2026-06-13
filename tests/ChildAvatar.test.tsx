import { render, screen } from '@testing-library/react';
import { ChildAvatar } from '../src/components/editor/ChildAvatar';

it('shows a Child marker on a non-animated avatar-sized placeholder', () => {
  const { container } = render(<ChildAvatar />);
  expect(screen.getByText('Child')).toBeTruthy();
  // Reuses the real avatar's canvas element for identical sizing/layout.
  expect(container.querySelector('canvas')).toBeTruthy();
  // The skeleton must not pulse.
  expect(container.querySelector('.animate-pulse')).toBeNull();
});
