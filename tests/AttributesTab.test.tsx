import { render, screen, fireEvent } from '@testing-library/react';
import { AttributesTab } from '../src/components/editor/AttributesTab';
import { useSaveStore } from '../src/store/saveStore';

const maleDweller: any = { serializeId: 1, gender: 2, isChild: false };

beforeEach(() => {
  useSaveStore.setState({
    save: { dwellers: { dwellers: [{
      serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2, rarity: 'Normal',
      health: { healthValue: 150, maxHealth: 200, radiationValue: 20, lastLevelUpdated: 10 },
      happiness: { happinessValue: 60 },
    }] } } as any,
    selectedDwellerId: 1, fileName: 'V.sav',
  });
});

const selected = () => useSaveStore.getState().getSelectedDweller() as any;

it('edits the dweller first name', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Zed' } });
  expect(selected().name).toBe('Zed');
});

it('edits the dweller last name', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
  expect(selected().lastName).toBe('Smith');
});

it('applies max health on blur, not on every keystroke', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  const input = screen.getByLabelText(/max health/i);
  fireEvent.change(input, { target: { value: '3' } });
  expect(selected().health.maxHealth).toBe(200);
  fireEvent.change(input, { target: { value: '300' } });
  fireEvent.blur(input);
  expect(selected().health.maxHealth).toBe(300);
  expect(selected().health.lastLevelUpdated).toBe(10);
});

it('heals fully: health to max and radiation to 0', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  fireEvent.click(screen.getByRole('button', { name: /heal fully/i }));
  expect(selected().health).toMatchObject({ healthValue: 200, radiationValue: 0, maxHealth: 200 });
});

it('edits happiness with the slider', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  fireEvent.change(screen.getByLabelText(/happiness slider/i), { target: { value: '90' } });
  expect(selected().happiness.happinessValue).toBe(90);
});

it('shows a Normal dweller as Common and sets a new rarity', () => {
  render(<AttributesTab dweller={maleDweller} onChange={() => {}} index={null} />);
  expect(screen.getByRole('button', { name: 'Common' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Legendary' }));
  expect(selected().rarity).toBe('Legendary');
});

const childDweller: any = { serializeId: 1, gender: 1, isChild: true };

it('shows only Name and Danger Zone for child dwellers', () => {
  render(<AttributesTab dweller={childDweller} onChange={() => {}} index={null} />);
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
  expect(screen.queryByText('Health')).toBeNull();
  expect(screen.queryByText('Happiness')).toBeNull();
  expect(screen.queryByText('Rarity')).toBeNull();
});
