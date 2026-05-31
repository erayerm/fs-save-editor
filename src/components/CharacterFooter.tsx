import { useRef } from 'react';
import { useSaveStore } from '../store/saveStore';
import { CharacterCard, CARD_W, CARD_GAP } from './CharacterCard';
import { useWindowedRange } from '../lib/useWindowedRange';

const OVERSCAN = 3;

export function CharacterFooter() {
  const save = useSaveStore((s) => s.save);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dwellers = save?.dwellers.dwellers ?? [];
  const count = dwellers.length;

  const { start, end } = useWindowedRange(scrollRef, CARD_W, count, OVERSCAN);

  if (!save) return null;

  return (
    <div
      ref={scrollRef}
      className="shrink-0 h-64 bg-zinc-900 border-t border-zinc-700 overflow-x-auto overflow-y-hidden"
      style={{ position: 'relative' }}
    >
      {/* Inner spacer to give the scrollbar the correct total width */}
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
    </div>
  );
}
