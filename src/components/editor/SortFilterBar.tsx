import { useEffect, useRef, useState } from 'react';
import type { SortDir, SpecialKey } from '../../lib/pickerSort';

const SPECIALS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

type IconProps = { className?: string };

function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SortIcon({ className }: IconProps) {
  // Classic "sort" glyph: descending bars.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="4" y1="6" x2="17" y2="6" />
      <line x1="4" y1="12" x2="12" y2="12" />
      <line x1="4" y1="18" x2="8" y2="18" />
    </svg>
  );
}

function ResetIcon({ className }: IconProps) {
  // Classic "restart" glyph: a circular arrow.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function ChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** A single SPECIAL stat as a circular toggle (green-filled when selected). */
function StatCircle({ letter, selected, onClick }: { letter: SpecialKey; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={letter}
      className={[
        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border transition-colors',
        selected
          ? 'bg-green-500 border-green-400 text-zinc-900'
          : 'bg-zinc-900 border-zinc-600 text-zinc-300 hover:border-green-400 hover:text-green-400',
      ].join(' ')}
    >
      {letter}
    </button>
  );
}

/** SPECIAL stat filter: a button that opens a popover of the 7 circular stat icons. */
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
        aria-haspopup="true"
        title="Filter by SPECIAL"
        className={[
          'h-8 pl-2.5 pr-2 rounded-md border flex items-center gap-1.5 text-sm transition-colors',
          stat
            ? 'border-green-500/60 bg-green-950/40 text-zinc-100'
            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
        ].join(' ')}
      >
        <span className="font-medium tracking-wide">SPECIAL</span>
        {stat ? (
          <span className="w-5 h-5 rounded-full bg-green-500 text-zinc-900 text-[11px] font-bold flex items-center justify-center">
            {stat}
          </span>
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-20 p-3 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-zinc-400">Filter by SPECIAL</span>
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              disabled={!stat}
              className="text-xs text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1.5">
            {SPECIALS.map((s) => (
              <StatCircle
                key={s}
                letter={s}
                selected={stat === s}
                onClick={() => { onChange(stat === s ? null : s); setOpen(false); }}
              />
            ))}
          </div>
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
    <div className="sticky top-0 z-10 flex items-center gap-2 px-2 py-2 mb-2 bg-zinc-900 border-b border-zinc-700">
      {/* Search with a leading magnifier icon */}
      <div className="relative flex-1 min-w-0">
        <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          aria-label="Search"
          className="w-full h-8 bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-md pl-8 pr-2 text-sm focus:outline-none focus:border-zinc-500"
        />
      </div>

      {mode === 'outfit' && onStatChange && (
        <SpecialFilter stat={stat ?? null} onChange={onStatChange} />
      )}

      {(mode === 'weapon' || mode === 'outfit') && onDirChange && (
        <div className="shrink-0 h-8 flex items-center gap-1 pl-2 pr-1 rounded-md border border-zinc-700 bg-zinc-800">
          <SortIcon className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={dir ?? 'default'}
            onChange={(e) => onDirChange(e.target.value as SortDir)}
            aria-label="Sort"
            className="bg-transparent text-zinc-100 text-sm pr-1 focus:outline-none cursor-pointer"
          >
            <option value="default">Default</option>
            <option value="desc">{mode === 'weapon' ? 'Damage: high to low' : 'High to low'}</option>
            <option value="asc">{mode === 'weapon' ? 'Damage: low to high' : 'Low to high'}</option>
          </select>
        </div>
      )}

      {/* Reset: classic restart icon */}
      <button
        type="button"
        onClick={onReset}
        title="Reset filters"
        aria-label="Reset filters"
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
      >
        <ResetIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
