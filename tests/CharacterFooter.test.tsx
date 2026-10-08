import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterFooter } from '../src/components/CharacterFooter';
import { useSaveStore } from '../src/store/saveStore';
import { RoomBadge } from '../src/components/RoomBadge';
import { buildRoomAssignments, ALL_ROOMS } from '../src/lib/rooms';

// jsdom lacks ResizeObserver — provide a minimal stub
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// jsdom has no WebGL — mock the renderer so DwellerCanvas doesn't throw
vi.mock('../src/lib/dwellerWebGL', () => ({
  createDwellerRenderer: () => ({ draw: vi.fn(), dispose: vi.fn() }),
}));

vi.mock('../src/lib/meshLoader', () => ({
  loadMeshSet: () => new Promise(() => {}),
  _resetMeshCache: vi.fn(),
}));

vi.mock('../src/lib/spriteIndex', () => ({
  loadSpriteIndex: () => new Promise(() => {}),
}));

vi.mock('../src/lib/atlasLoader', () => ({
  loadAtlas: () => new Promise(() => {}),
}));

const makeSave = (dwellers: any[]) => ({
  dwellers: { dwellers },
  vault: {},
} as any);

const dweller1 = {
  serializeId: 1,
  name: 'Alice',
  lastName: 'Smith',
  gender: 1,
  savedRoom: 5,
  stats: { stats: Array.from({ length: 8 }, (_, i) => ({ value: i, mod: 0, exp: 0 })) },
};

const dweller2 = {
  serializeId: 2,
  name: 'Bob',
  lastName: 'Jones',
  gender: 2,
  savedRoom: 3,
  stats: { stats: Array.from({ length: 8 }, (_, i) => ({ value: i + 1, mod: 0, exp: 0 })) },
};

describe('CharacterFooter', () => {
  beforeEach(() => {
    useSaveStore.setState({ save: null, selectedDwellerId: null, fileName: null, roomFilter: ALL_ROOMS, roomQuery: '' });
  });

  it('renders nothing when no save is loaded', () => {
    const { container } = render(<CharacterFooter />);
    expect(container.firstChild).toBeNull();
  });

  it('shows dweller names', () => {
    useSaveStore.setState({ save: makeSave([dweller1, dweller2]) });
    render(<CharacterFooter />);
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
  });

  it('selecting a card updates selectedDwellerId in the store', () => {
    useSaveStore.setState({ save: makeSave([dweller1, dweller2]), selectedDwellerId: null });
    render(<CharacterFooter />);
    fireEvent.click(screen.getByText(/Alice Smith/i).closest('div[style]')!);
    expect(useSaveStore.getState().selectedDwellerId).toBe(1);
  });

  it('highlights selected dweller with green ring class', () => {
    useSaveStore.setState({ save: makeSave([dweller1, dweller2]), selectedDwellerId: 1 });
    render(<CharacterFooter />);
    // Find the card element for Alice — it should have ring-2 ring-green-400
    const aliceCard = screen.getByText(/Alice Smith/i).closest('[class*="ring-green"]');
    expect(aliceCard).not.toBeNull();
  });

  it('room search narrows both the room badges and the dwellers', () => {
    const save = {
      ...makeSave([dweller1, dweller2]),
      vault: {
        rooms: [
          { type: 'Geothermal', row: 1, col: 0, deserializeID: 10, dwellers: [1] },
          { type: 'Cafeteria', row: 2, col: 0, deserializeID: 11, dwellers: [2] },
        ],
      },
    };
    useSaveStore.setState({ save });
    render(<CharacterFooter />);
    fireEvent.click(screen.getByRole('button', { name: 'Search rooms' }));
    fireEvent.change(screen.getByLabelText('Search rooms', { selector: 'input' }), { target: { value: 'gen' } });

    const toolbar = screen.getByRole('toolbar', { name: /filter dwellers by room/i });
    expect(toolbar).toHaveTextContent('All matches');
    expect(toolbar).toHaveTextContent('Power Generator');
    expect(toolbar).not.toHaveTextContent('Diner');
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bob Jones/i)).not.toBeInTheDocument();
  });

  it('clicking the portrait room badge filters the strip to that room', () => {
    const save = {
      ...makeSave([dweller1, dweller2]),
      vault: {
        rooms: [
          { type: 'Geothermal', row: 1, col: 0, deserializeID: 10, dwellers: [1] },
          { type: 'Cafeteria', row: 2, col: 0, deserializeID: 11, dwellers: [2] },
        ],
      },
    };
    useSaveStore.setState({ save, roomQuery: 'gen' });
    render(<CharacterFooter />);
    const diner = buildRoomAssignments(save).get(2)!;
    render(<RoomBadge room={diner} />);

    fireEvent.click(screen.getByTestId('dweller-room'));

    expect(screen.getByRole('button', { name: /^Diner/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alice Smith/i)).not.toBeInTheDocument();
  });
});
