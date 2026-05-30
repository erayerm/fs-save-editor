import { render, screen, fireEvent } from '@testing-library/react';
import { VaultSettings } from '../src/components/VaultSettings';
import { useSaveStore } from '../src/store/saveStore';
import { getCaps } from '../src/lib/vaultEdit';

it('shows caps and lunchbox fields and edits caps via setVault', () => {
  useSaveStore.setState({
    save: { vault: { storage: { resources: { Nuka: 100 } }, LunchBoxesCount: 2 }, dwellers: { dwellers: [] } } as any,
    selectedDwellerId: null, fileName: 'V.sav',
  });
  render(<VaultSettings />);
  const caps = screen.getByLabelText(/caps/i) as HTMLInputElement;
  expect(caps.value).toBe('100');
  fireEvent.change(caps, { target: { value: '500' } });
  expect(getCaps(useSaveStore.getState().save!)).toBe(500);
});
