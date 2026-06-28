import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites, pinFavorites } from '../src/lib/useFavorites';

describe('useFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('toggles, persists, and isolates categories', () => {
    const { result } = renderHook(() => useFavorites('hair'));
    expect(result.current.favorites).toEqual([]);

    act(() => result.current.toggle('01'));
    expect(result.current.isFavorite('01')).toBe(true);
    expect(JSON.parse(localStorage.getItem('fs-favorites')!).hair).toEqual(['01']);

    const face = renderHook(() => useFavorites('face'));
    expect(face.result.current.favorites).toEqual([]);

    act(() => result.current.toggle('01'));
    expect(result.current.isFavorite('01')).toBe(false);
  });

  it('starts empty on malformed JSON', () => {
    localStorage.setItem('fs-favorites', '{ not json');
    const { result } = renderHook(() => useFavorites('weapon'));
    expect(result.current.favorites).toEqual([]);
  });
});

describe('pinFavorites', () => {
  it('puts favorites first in favorite-order, keeps the rest stable', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const out = pinFavorites(items, (i) => i.id, ['c', 'a']);
    expect(out.map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('returns items unchanged when there are no favorites', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(pinFavorites(items, (i) => i.id, []).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('ignores favorite ids not present in items', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(pinFavorites(items, (i) => i.id, ['zzz', 'b']).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('handles all items favorited (pure reorder)', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pinFavorites(items, (i) => i.id, ['c', 'b', 'a']).map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });
});
