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

it('lists the stash grouped with counts and edits it', () => {
  const item = (id: string, type: string) =>
    ({ id, type, hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false });
  seed({ inventory: { items: [item('Shovel', 'Junk'), item('Shovel', 'Junk'), item('LabCoat', 'Outfit')] } });
  render(<VaultSettings />);
  expect(screen.getByRole('tab', { name: /all \(3\)/i })).toBeTruthy();
  expect(screen.getByLabelText('2 in stash')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Remove one Shovel' }));
  let items = (useSaveStore.getState().save!.vault as any).inventory.items;
  expect(items.map((i: any) => i.id)).toEqual(['Shovel', 'LabCoat']);

  fireEvent.click(screen.getByRole('button', { name: 'Add one Shovel' }));
  items = (useSaveStore.getState().save!.vault as any).inventory.items;
  expect(items.map((i: any) => i.id)).toEqual(['Shovel', 'LabCoat', 'Shovel']);

  fireEvent.click(screen.getByRole('tab', { name: /junk/i }));
  expect(screen.queryByRole('button', { name: /LabCoat|Lab Coat/ })).toBeNull();
});

it('removes every copy of an item with the trash button', () => {
  const item = (id: string, type: string) => ({ id, type });
  seed({ inventory: { items: [item('Shovel', 'Junk'), item('Yarn', 'Junk'), item('Shovel', 'Junk')] } });
  render(<VaultSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove all Shovel' }));
  const items = (useSaveStore.getState().save!.vault as any).inventory.items;
  expect(items.map((i: any) => i.id)).toEqual(['Yarn']);
});

it('searches the stash by name', () => {
  const item = (id: string, type: string) => ({ id, type });
  seed({ inventory: { items: [item('Shovel', 'Junk'), item('DuctTape', 'Junk')] } });
  render(<VaultSettings />);
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'duct' } });
  expect(screen.getByText('Duct Tape')).toBeTruthy();
  expect(screen.queryByText('Shovel')).toBeNull();
});

it('paginates the stash and returns to page 1 when searching', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `Item${String(i).padStart(2, '0')}`, type: 'Junk' }));
  seed({ inventory: { items } });
  render(<VaultSettings />);
  expect(screen.getAllByRole('listitem')).toHaveLength(24);
  expect(screen.getByText('1–24 of 30')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page');

  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Item0' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
  expect(screen.queryByRole('navigation', { name: 'Stash pages' })).toBeNull();
});

it('shows capacity from storage rooms and disables adding when full', () => {
  const items = Array.from({ length: 20 }, () => ({ id: 'Shovel', type: 'Junk' }));
  seed({ rooms: [{ type: 'Storage', level: 1, mergeLevel: 1 }], inventory: { items } });
  render(<VaultSettings />);
  expect(screen.getByRole('meter', { name: 'Stash capacity' }).getAttribute('aria-valuemax')).toBe('20');
  expect(screen.getByText('20 / 20')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Add one Shovel' }) as HTMLButtonElement).disabled).toBe(true);
});

it('setBoxCount preserves other types', () => {
  const s = { vault: { LunchBoxesByType: [0, 2, 3] } } as any;
  const out = setBoxCount(s, BOX_TYPES.PetCarrier, 0);
  expect((out.vault as any).LunchBoxesByType).toEqual([0, 3]);
});
