import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSaveStore } from '../src/store/saveStore';
import { Header } from '../src/components/Header';

describe('Header tip button', () => {
  it('renders the Vault Boy icon (span), not a coffee svg', () => {
    useSaveStore.setState({ save: { dwellers: { dwellers: [] } } as any, fileName: 'V.sav', selectedDwellerId: null });
    render(<Header />);
    const tip = screen.getByLabelText('Tip');
    const span = tip.querySelector('span');
    expect(span).toBeTruthy();
    expect(tip.querySelector('svg')).toBeNull();
    // jsdom normalizes the keyword to lowercase:
    expect(span!.style.backgroundColor.toLowerCase()).toBe('currentcolor');
  });
});
