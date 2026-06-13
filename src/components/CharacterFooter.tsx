import { useRef, useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import { CharacterCard, CARD_W, CARD_GAP } from './CharacterCard';
import { useWindowedRange } from '../lib/useWindowedRange';
import { filterByText } from '../lib/pickerSort';

const OVERSCAN = 3;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CharacterFooter() {
  const save = useSaveStore((s) => s.save);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const all = save?.dwellers.dwellers ?? [];
  const dwellers = filterByText(all, query, (d) => `${d.name ?? ''} ${d.lastName ?? ''}`);
  const count = dwellers.length;

  const { start, end } = useWindowedRange(scrollRef, CARD_W, count, OVERSCAN);

  if (!save) return null;

  return (
    <div className="shrink-0 relative">
      {/* Filter handle stuck to the top-right edge of the bar (above it). Clicking
          reveals a search input that grows to the left; clicking again clears it. */}
      <div className="absolute right-3 -top-8 z-20 flex items-stretch h-8">
        {open && (
          <div className="relative mr-1">
            <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name…"
              aria-label="Filter dwellers by name"
              className="w-52 h-8 bg-zinc-800 border border-zinc-700 rounded-md pl-8 pr-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 shadow-lg"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => { if (open) { setQuery(''); setOpen(false); } else setOpen(true); }}
          title={open ? 'Clear filter' : 'Filter dwellers'}
          aria-label={open ? 'Clear filter' : 'Filter dwellers'}
          aria-pressed={open}
          className={[
            'flex items-center justify-center w-9 rounded-t-md border border-b-0 transition-colors',
            open
              ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800',
          ].join(' ')}
        >
          {open ? <CloseIcon className="w-4 h-4" /> : <FilterIcon className="w-4 h-4" />}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="h-64 bg-zinc-900 border-t border-zinc-700 overflow-x-auto overflow-y-hidden"
        style={{ position: 'relative' }}
      >
        {count === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            No dwellers match “{query}”.
          </div>
        ) : (
          /* Inner spacer to give the scrollbar the correct total width */
          <div style={{ width: count * CARD_W, height: '100%', position: 'relative' }}>
            {dwellers.slice(start, end).map((dweller, localIdx) => {
              const globalIdx = start + localIdx;
              return (
                <div
                  key={dweller.serializeId}
                  style={{ position: 'absolute', left: globalIdx * CARD_W + CARD_GAP / 2, top: 8, height: 'calc(100% - 16px)' }}
                >
                  <CharacterCard dweller={dweller} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
