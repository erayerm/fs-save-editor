import { useCallback, useState } from 'react';

export type FavoriteCategory = 'hair' | 'face' | 'outfit' | 'weapon' | 'pet';

const STORAGE_KEY = 'fs-favorites';
type Store = Record<FavoriteCategory, string[]>;

const emptyStore = (): Store => ({ hair: [], face: [], outfit: [], weapon: [], pet: [] });

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const p = JSON.parse(raw);
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    return {
      hair: arr(p?.hair), face: arr(p?.face), outfit: arr(p?.outfit),
      weapon: arr(p?.weapon), pet: arr(p?.pet),
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore quota/SSR */ }
}

export function useFavorites(category: FavoriteCategory) {
  const [favorites, setFavorites] = useState<string[]>(() => readStore()[category]);

  const toggle = useCallback((id: string) => {
    const store = readStore();
    const list = store[category];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    writeStore({ ...store, [category]: next });
    setFavorites(next);
  }, [category]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, isFavorite, toggle };
}

/** Stable reorder: favorited items first (in `favorites` order), the rest unchanged. */
export function pinFavorites<T>(items: T[], getId: (item: T) => string, favorites: string[]): T[] {
  const rank = (id: string) => {
    const i = favorites.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank(getId(a.item)) - rank(getId(b.item))) || (a.i - b.i))
    .map((x) => x.item);
}
