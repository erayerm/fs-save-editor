import { useRef, useState, useEffect } from 'react';
import { useSaveStore } from '../store/saveStore';
import { CharacterCard, CARD_W, CARD_GAP } from './CharacterCard';
import { useWindowedRange } from '../lib/useWindowedRange';
import { filterByText } from '../lib/pickerSort';
import { FALLOUT_GREEN } from './SpecialIcon';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Focus the field as it expands.
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const all = save?.dwellers.dwellers ?? [];
  const dwellers = filterByText(all, query, (d) => `${d.name ?? ''} ${d.lastName ?? ''}`);
  const count = dwellers.length;

  const { start, end } = useWindowedRange(scrollRef, CARD_W, count, OVERSCAN);

  if (!save) return null;

  return (
    <div className="shrink-0 relative">
      {/* Filter control: one solid fallout-green bar attached above the dweller
          bar. The funnel toggles a search field that grows to the left; the
          field and button share the same continuous green background. */}
      <div
        className="absolute right-3 -top-8 z-20 flex items-stretch h-8 rounded-t-md overflow-hidden"
        style={{ backgroundColor: FALLOUT_GREEN }}
      >
        {/* Expanding search field (grows to the left) */}
        <div
          className={[
            'flex items-center transition-all duration-200 ease-out',
            open ? 'w-56' : 'w-0',
          ].join(' ')}
        >
          <SearchIcon className="w-4 h-4 ml-2.5 shrink-0 text-zinc-800" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            aria-label="Filter dwellers by name"
            tabIndex={open ? 0 : -1}
            className="flex-1 min-w-0 h-8 bg-transparent px-2 text-sm text-zinc-900 placeholder-zinc-700 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear text"
              className="shrink-0 mr-1 flex items-center justify-center w-5 h-5 rounded text-zinc-800 hover:bg-black/10"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Funnel handle (dark icon on the green background) */}
        <button
          type="button"
          onClick={() => { if (open) { setQuery(''); setOpen(false); } else setOpen(true); }}
          title={open ? 'Close filter' : 'Filter dwellers'}
          aria-label={open ? 'Close filter' : 'Filter dwellers'}
          aria-pressed={open}
          className="shrink-0 flex items-center justify-center w-9 text-zinc-900 hover:bg-black/10 transition-colors"
        >
          <FilterIcon className="w-4 h-4" />
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
