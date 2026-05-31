import { render, screen, fireEvent } from '@testing-library/react';
import { VaultSettings } from '../src/components/VaultSettings';
import { useSaveStore } from '../src/store/saveStore';
import {
  getCaps, getBoxCount, getVaultMode, BOX_TYPES, setBoxCount,
} from '../src/lib/vaultEdit';

function seed(vault: any) {
  useSaveStore.setState({
    save: { vault, dwellers: { dwellers: [] } } as any,
    selectedDwellerId: null, fileName: 'V.sav',
  });
}

it('shows caps and lunchbox fields and edits caps via setVault', () => {
  seed({ storage: { resources: { Nuka: 100 } }, LunchBoxesCount: 2 });
  render(<VaultSettings />);
  const caps = screen.getByLabelText(/caps/i) as HTMLInputElement;
  expect(caps.value).toBe('100');
  fireEvent.change(caps, { target: { value: '500' } });
  expect(getCaps(useSaveStore.getState().save!)).toBe(500);
});

it('reads box-type counts from LunchBoxesByType', () => {
  seed({ LunchBoxesByType: [0, 0, 1, 2, 2, 2, 3] });
  render(<VaultSettings />);
  expect((screen.getByLabelText('Lunchboxes') as HTMLInputElement).value).toBe('2');
  expect((screen.getByLabelText('Mr. Handies') as HTMLInputElement).value).toBe('1');
  expect((screen.getByLabelText('Pet Carriers') as HTMLInputElement).value).toBe('3');
  expect((screen.getByLabelText('Starter Packs') as HTMLInputElement).value).toBe('1');
});

it('editing a box count rebuilds LunchBoxesByType and keeps LunchBoxesCount in sync', () => {
  seed({ LunchBoxesByType: [0, 1] });
  render(<VaultSettings />);
  fireEvent.change(screen.getByLabelText('Mr. Handies'), { target: { value: '3' } });
  const save = useSaveStore.getState().save!;
  expect(getBoxCount(save, BOX_TYPES.MrHandy)).toBe(3);
  expect(getBoxCount(save, BOX_TYPES.Lunchbox)).toBe(1);
  expect((save.vault as any).LunchBoxesByType).toEqual([0, 1, 1, 1]);
  expect((save.vault as any).LunchBoxesCount).toBe(4);
});

it('reads and edits the vault mode', () => {
  seed({ VaultMode: 'Survival' });
  render(<VaultSettings />);
  const mode = screen.getByLabelText(/vault mode/i) as HTMLSelectElement;
  expect(mode.value).toBe('Survival');
  fireEvent.change(mode, { target: { value: 'Normal' } });
  expect(getVaultMode(useSaveStore.getState().save!)).toBe('Normal');
});

it('setBoxCount preserves other types', () => {
  const s = { vault: { LunchBoxesByType: [0, 2, 3] } } as any;
  const out = setBoxCount(s, BOX_TYPES.PetCarrier, 0);
  expect((out.vault as any).LunchBoxesByType).toEqual([0, 3]);
});
