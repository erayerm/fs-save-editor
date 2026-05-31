import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { useSaveStore } from '../src/store/saveStore';

it('shows the import landing when no save is loaded', () => {
  useSaveStore.setState({ save: null, fileName: null, selectedDwellerId: null });
  render(<App />);
  expect(screen.getByText(/import .sav/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /çıkış/i })).not.toBeInTheDocument();
});
it('shows the header with Export and Change .sav File once a save is loaded', () => {
  useSaveStore.setState({ save: { dwellers: { dwellers: [] } } as any, fileName: 'V.sav', selectedDwellerId: null });
  render(<App />);
  expect(screen.getByRole('button', { name: /export .sav/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /change .sav file/i })).toBeInTheDocument();
});
