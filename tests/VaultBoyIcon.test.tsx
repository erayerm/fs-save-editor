import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VaultBoyIcon } from '../src/components/VaultBoyIcon';

describe('VaultBoyIcon', () => {
  it('renders a currentColor-filled span masked by the silhouette, sized by prop', () => {
    const { container } = render(<VaultBoyIcon size={20} className="x" />);
    const span = container.querySelector('span')!;
    expect(span).toBeTruthy();
    expect(span).toHaveClass('x');
    expect(span.style.backgroundColor.toLowerCase()).toBe('currentcolor');
    expect(span.style.width).toBe('20px');
    expect(span.style.height).toBe('20px');
    expect(span.getAttribute('style')).toContain('vault-boy-silhouette.png');
  });

  it('defaults size to 18', () => {
    const { container } = render(<VaultBoyIcon />);
    expect(container.querySelector('span')!.style.width).toBe('18px');
  });
});
