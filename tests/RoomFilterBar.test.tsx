import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomFilterBar } from '../src/components/RoomFilterBar';
import { ALL_ROOMS, type RoomEntry } from '../src/lib/rooms';

const water: RoomEntry = {
  key: 'room-7',
  name: 'Water Treatment',
  room: { type: 'Water', class: 'Production', level: 2, mergeLevel: 2, row: 2, col: 4, dwellers: [1, 2, 3], deserializeID: 7 },
  dwellerIds: [1, 2, 3],
};

function renderBar() {
  return render(
    <RoomFilterBar
      rooms={[water]}
      counts={new Map([[water.key, 3]])}
      total={5}
      unassignedCount={2}
      active={ALL_ROOMS}
      onSelect={() => {}}
    />,
  );
}

describe('RoomFilterBar hover details', () => {
  it('shows the room details card while a room badge is hovered', () => {
    renderBar();
    const badge = screen.getByRole('button', { name: /Water Treatment/ });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(badge);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Water Treatment');
    expect(tip).toHaveTextContent('Lv 2 · 2-wide · Floor 3');
    expect(tip).toHaveTextContent('3/4 dwellers');
    expect(badge).toHaveAttribute('aria-describedby', tip.id);

    fireEvent.mouseLeave(badge);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('also opens on keyboard focus, but not for the All/Unassigned badges', () => {
    renderBar();
    fireEvent.focus(screen.getByRole('button', { name: /Water Treatment/ }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(screen.getByRole('button', { name: /Water Treatment/ }));

    fireEvent.mouseEnter(screen.getByRole('button', { name: /All rooms/ }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Unassigned/ }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
