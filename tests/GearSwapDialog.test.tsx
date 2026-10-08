import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GearSwapDialog, requestGearChange } from '../src/components/editor/GearSwapDialog';
import { useSaveStore } from '../src/store/saveStore';
import { setWeapon } from '../src/lib/dwellerEdit';
import { getStashItems } from '../src/lib/stash';

const ref = (id: string, type: string) =>
  ({ id, type, hasBeenAssigned: false, hasRandonWeaponBeenAssigned: false });

function seed(weapon: string, stashed = 0) {
  useSaveStore.getState().setSave({
    dwellers: { dwellers: [{
      serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2,
      equipedWeapon: ref(weapon, 'Weapon'), equipedOutfit: ref('jumpsuit', 'Outfit'),
    }] },
    vault: { inventory: { items: Array.from({ length: stashed }, () => ref('Shovel', 'Junk')) } },
  } as any, 'x.sav');
}

const weaponId = () => useSaveStore.getState().getSelectedDweller()!.equipedWeapon!.id;

describe('GearSwapDialog', () => {
  beforeEach(() => useSaveStore.getState().clear());

  it('applies immediately when replacing the default Fist', () => {
    seed('Fist');
    render(<GearSwapDialog />);
    act(() => requestGearChange((d) => setWeapon(d, 'Railgun')));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(weaponId()).toBe('Railgun');
  });

  it('asks before replacing gear and stashes it on Stash', () => {
    seed('Minigun');
    render(<GearSwapDialog />);
    act(() => requestGearChange((d) => setWeapon(d, 'Railgun')));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(weaponId()).toBe('Minigun');
    fireEvent.click(screen.getByRole('button', { name: 'Stash' }));
    expect(weaponId()).toBe('Railgun');
    expect(getStashItems(useSaveStore.getState().save!).map((i) => i.id)).toEqual(['Minigun']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Discard replaces without stashing; Cancel changes nothing', () => {
    seed('Minigun');
    render(<GearSwapDialog />);
    act(() => requestGearChange((d) => setWeapon(d, 'Railgun')));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(weaponId()).toBe('Minigun');

    act(() => requestGearChange((d) => setWeapon(d, 'Railgun')));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(weaponId()).toBe('Railgun');
    expect(getStashItems(useSaveStore.getState().save!)).toEqual([]);
  });

  it('disables Stash when the stash is full', () => {
    seed('Minigun', 10);
    render(<GearSwapDialog />);
    act(() => requestGearChange((d) => setWeapon(d, 'Railgun')));
    expect((screen.getByRole('button', { name: 'Stash' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/stash is full/i)).toBeTruthy();
  });
});
