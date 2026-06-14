import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadLegendaryIndex } from '../lib/legendaryIndex';
import { useDwellerThumbnail } from '../lib/useDwellerThumbnail';
import { decodeArgb } from '../lib/colors';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { LegendaryMeta } from '../types/legendary';

function toRenderable(e: LegendaryMeta): RenderableDweller {
  return {
    gender: e.gender,
    hairName: e.hair ?? undefined,
    facialHair: e.faceMask ?? undefined,
    outfitName: e.outfitId,
    happinessValue: 75,
    skinColor: decodeArgb(e.skinColor),
    hairColor: decodeArgb(e.hairColor),
    outfitColor: decodeArgb(0xffffffff),
  };
}

function LegendaryCard({ entry, selected, onSelect }: {
  entry: LegendaryMeta; selected: boolean; onSelect: () => void;
}) {
  const renderable = useMemo(() => toRenderable(entry), [entry]);
  const thumb = useDwellerThumbnail(renderable);
  const fullName = [entry.name, entry.lastName].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      onClick={onSelect}
      title={fullName}
      className={`flex flex-col items-center rounded p-1 transition-all ${
        selected ? 'ring-2 ring-green-400 bg-green-950/40' : 'hover:bg-zinc-800'
      }`}
    >
      <div className="w-[120px] bg-zinc-900/60 rounded" style={{ aspectRatio: '170 / 221' }}>
        {thumb && <img src={thumb} alt={fullName} className="w-full h-full object-contain" />}
      </div>
      <div className="text-xs text-zinc-200 mt-1 text-center leading-tight">{fullName}</div>
    </button>
  );
}

export function LegendaryCatalogModal({ onAdd, onClose }: {
  onAdd: (entry: LegendaryMeta) => void; onClose: () => void;
}) {
  const [list, setList] = useState<LegendaryMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LegendaryMeta | null>(null);

  useEffect(() => {
    loadLegendaryIndex().then((idx) => setList(idx.legendaries)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex flex-col w-[min(900px,90vw)] h-[min(700px,85vh)] bg-zinc-900 rounded-lg shadow-xl border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-700 text-zinc-100 font-medium">Add Legendary Dweller</div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {error && <div className="text-red-400 text-sm">Could not load legendaries: {error}</div>}
          {!list && !error && <div className="text-zinc-400 text-sm">Loading...</div>}
          {list && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}>
              {list.map((e) => (
                <LegendaryCard
                  key={e.uniqueData}
                  entry={e}
                  selected={selected?.uniqueData === e.uniqueData}
                  onSelect={() => setSelected(e)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button type="button" onClick={onClose}
            className="px-3 h-8 rounded text-sm bg-zinc-700 hover:bg-zinc-600 text-white">Cancel</button>
          <button type="button" disabled={!selected}
            onClick={() => selected && onAdd(selected)}
            className="px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white">
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
