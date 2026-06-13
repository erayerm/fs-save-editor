import { render, screen, fireEvent } from '@testing-library/react';
import { OthersTab } from '../src/components/editor/OthersTab';
import { useSaveStore } from '../src/store/saveStore';

const maleDweller: any = { serializeId: 1, gender: 2, isChild: false };

beforeEach(() => {
  useSaveStore.setState({
    save: { dwellers: { dwellers: [{
      serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2,
    }] } } as any,
    selectedDwellerId: 1, fileName: 'V.sav',
  });
});

it('edits the dweller first name', () => {
  render(<OthersTab dweller={maleDweller} onChange={() => {}} />);
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Zed' } });
  expect(useSaveStore.getState().getSelectedDweller()!.name).toBe('Zed');
});

it('edits the dweller last name', () => {
  render(<OthersTab dweller={maleDweller} onChange={() => {}} />);
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
  expect(useSaveStore.getState().getSelectedDweller()!.lastName).toBe('Smith');
});

const childDweller: any = { serializeId: 1, gender: 1, isChild: true };

it('shows only Name and Danger Zone for child dwellers', () => {
  render(<OthersTab dweller={childDweller} onChange={() => {}} index={null} />);
  // Name is present and editable
  const fn = screen.getByLabelText(/first name/i) as HTMLInputElement;
  expect(fn.disabled).toBe(false);
  // Danger Zone is present
  expect(screen.getByRole('button', { name: /evict dweller/i })).toBeTruthy();
  // Adult-only sections are hidden
  expect(screen.queryByText('Gender')).toBeNull();
  expect(screen.queryByText('Level')).toBeNull();
  expect(screen.queryByText(/skin color/i)).toBeNull();
  expect(screen.queryByText('Pregnancy')).toBeNull();
});
