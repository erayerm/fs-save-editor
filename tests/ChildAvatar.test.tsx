import { render, screen } from '@testing-library/react';
import { ChildAvatar } from '../src/components/editor/ChildAvatar';

it('shows a Child marker and a skeleton placeholder', () => {
  const { container } = render(<ChildAvatar />);
  expect(screen.getByText('Child')).toBeTruthy();
  expect(container.querySelector('.animate-pulse')).toBeTruthy();
});
