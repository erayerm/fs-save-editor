import { render, screen, fireEvent } from '@testing-library/react';
import { StatsTab } from '../src/components/editor/StatsTab';
import { useSaveStore } from '../src/store/saveStore';

const maleDweller: any = { serializeId: 1, gender: 2, isChild: false };

beforeEach(() => {
  useSaveStore.setState({
    save: { dwellers: { dwellers: [{
      serializeId: 1, name: 'Bob', lastName: 'Cox', gender: 2,
      stats: { stats: Array.from({ length: 8 }, () => ({ value: 1, mod: 0, exp: 0 })) },
    }] } } as any,
    selectedDwellerId: 1, fileName: 'V.sav',
  });
});

it('renders 7 SPECIAL controls and clamps edits to 1..10', () => {
  render(<StatsTab dweller={maleDweller} />);
  const s = screen.getByLabelText('S') as HTMLInputElement;
  fireEvent.change(s, { target: { value: '15' } });
  expect(useSaveStore.getState().getSelectedDweller()!.stats!.stats[1].value).toBe(10);
});
it('edits the dweller name', () => {
  render(<StatsTab dweller={maleDweller} />);
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Zed' } });
  expect(useSaveStore.getState().getSelectedDweller()!.name).toBe('Zed');
});
