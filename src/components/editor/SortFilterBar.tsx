import type { SortDir, SpecialKey } from '../../lib/pickerSort';

const SPECIALS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

export function SortFilterBar({
  mode, dir, onDirChange, stat, onStatChange,
}: {
  mode: 'weapon' | 'outfit';
  dir: SortDir;
  onDirChange: (d: SortDir) => void;
  /** Outfit mode only. */
  stat?: SpecialKey | null;
  onStatChange?: (s: SpecialKey | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1 text-sm">
      {mode === 'outfit' && (
        <label className="flex items-center gap-1 text-zinc-400">
          SPECIAL
          <select
            value={stat ?? ''}
            onChange={(e) => onStatChange?.(e.target.value ? (e.target.value as SpecialKey) : null)}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
          >
            <option value="">All</option>
            {SPECIALS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <label className="flex items-center gap-1 text-zinc-400">
        Sort
        <select
          value={dir}
          onChange={(e) => onDirChange(e.target.value as SortDir)}
          className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
        >
          <option value="desc">{mode === 'weapon' ? 'Damage: high to low' : 'High to low'}</option>
          <option value="asc">{mode === 'weapon' ? 'Damage: low to high' : 'Low to high'}</option>
        </select>
      </label>
    </div>
  );
}
