import { useEffect, useRef, useState } from 'react';
import type { SortDir, SpecialKey } from '../../lib/pickerSort';
import { SpecialIcon } from '../SpecialIcon';

const SPECIALS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

/** SPECIAL stat filter: a button that opens a popover of the 7 stat icons. */
function SpecialFilter({ stat, onChange }: { stat: SpecialKey | null; onChange: (s: SpecialKey | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
      >
        <span>SPECIAL</span>
        {stat ? <SpecialIcon letter={stat} size={16} /> : <span className="text-zinc-400 text-xs">All</span>}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-20 p-2 rounded border border-zinc-600 bg-zinc-800 shadow-lg flex flex-col gap-2"
          style={{ minWidth: 200 }}
        >
          <div className="grid grid-cols-7 gap-1">
            {SPECIALS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={stat === s}
                title={s}
                onClick={() => { onChange(stat === s ? null : s); setOpen(false); }}
                className={[
                  'flex items-center justify-center rounded p-1 transition-colors',
                  stat === s ? 'bg-green-950/60 ring-1 ring-green-400' : 'hover:bg-zinc-700',
                ].join(' ')}
              >
                <SpecialIcon letter={s} size={20} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="text-xs text-zinc-300 hover:text-white text-left px-1 disabled:opacity-40"
            disabled={!stat}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Sticky control bar above a picker grid. Search applies to every mode; the
 * weapon/outfit modes add a sort selector (with a Default/no-sort option), and
 * the outfit mode adds a SPECIAL filter popover. A Reset clears everything.
 */
export function SortFilterBar({
  mode, query, onQueryChange, onReset, dir, onDirChange, stat, onStatChange,
}: {
  mode: 'weapon' | 'outfit' | 'pet';
  query: string;
  onQueryChange: (q: string) => void;
  onReset: () => void;
  /** weapon + outfit modes */
  dir?: SortDir;
  onDirChange?: (d: SortDir) => void;
  /** outfit mode only */
  stat?: SpecialKey | null;
  onStatChange?: (s: SpecialKey | null) => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-1 py-2 mb-1 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 text-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className="flex-1 min-w-0 bg-zinc-700 text-zinc-100 placeholder-zinc-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
      {mode === 'outfit' && onStatChange && (
        <SpecialFilter stat={stat ?? null} onChange={onStatChange} />
      )}
      {(mode === 'weapon' || mode === 'outfit') && onDirChange && (
        <label className="flex items-center gap-1 text-zinc-400 shrink-0">
          <span>Sort</span>
          <select
            value={dir}
            onChange={(e) => onDirChange(e.target.value as SortDir)}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1"
          >
            <option value="default">Default</option>
            <option value="desc">{mode === 'weapon' ? 'Damage: high to low' : 'High to low'}</option>
            <option value="asc">{mode === 'weapon' ? 'Damage: low to high' : 'Low to high'}</option>
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={onReset}
        className="shrink-0 px-2 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
      >
        Reset
      </button>
    </div>
  );
}
