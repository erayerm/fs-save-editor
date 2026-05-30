import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { WeaponTab } from '../src/components/editor/WeaponTab';
import { useSaveStore } from '../src/store/saveStore';

vi.mock('../src/lib/weaponIndex', () => ({
  loadWeaponIndex: () => Promise.resolve({
    version: 1,
    weapons: {
      Fist:    { name: 'Fist',    damageMin: 1,  damageMax: 1,  icon: '' },
      Railgun: { name: 'Railgun', damageMin: 18, damageMax: 22, icon: '' },
    },
  }),
  weaponById: (idx: any, id: string) => idx.weapons[id] ?? null,
}));

const maleDweller: any = { serializeId: 1, gender: 2, isChild: false };

beforeEach(() => {
  useSaveStore.setState({
    save: { dwellers: { dwellers: [{ serializeId: 1, name: 'Bob', lastName: 'C', gender: 2,
      equipedWeapon: { id: 'Fist', type: 'Weapon' } }] } } as any,
    selectedDwellerId: 1, fileName: 'V.sav',
  });
});

it('lists weapons with damage and equips on click', async () => {
  render(<WeaponTab dweller={maleDweller} />);
  expect(await screen.findByText(/Railgun/)).toBeInTheDocument();
  expect(screen.getByText('18-22')).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Railgun/));
  await waitFor(() =>
    expect(useSaveStore.getState().getSelectedDweller()!.equipedWeapon!.id).toBe('Railgun'));
});
