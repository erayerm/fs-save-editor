import { useEffect, useState } from 'react';
import { useSaveStore } from '../../store/saveStore';
import { setStat } from '../../lib/dwellerEdit';
import { loadSpriteIndex, outfitItemById } from '../../lib/spriteIndex';
import { specialBonusFor } from '../../lib/outfitStats';
import { SPECIAL_ORDER } from '../../types/save';
import { SpecialIcon } from '../SpecialIcon';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';

/** Base SPECIAL caps at 10 and the strongest outfits add +7. */
const MAX_TOTAL = 17;

export function StatsTab({ dweller }: { dweller: RenderableDweller }) {
  const sel = useSaveStore((s) => s.getSelectedDweller());
  const updateRaw = useSaveStore((s) => s.updateSelectedDwellerRaw);
  const [index, setIndex] = useState<SpriteIndex | null>(null);

  useEffect(() => {
    let alive = true;
    loadSpriteIndex().then((idx) => { if (alive) setIndex(idx); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const outfitId = dweller.outfitName;
  const outfit = index && outfitId ? outfitItemById(index, outfitId) : null;
  const bonus = outfit?.special ?? (outfitId ? specialBonusFor(outfitId) : {});
  const outfitLabel = outfit?.name ?? outfitId;
  const baseOf = (i: number) => sel?.stats?.stats?.[i + 1]?.value ?? 1;

  return (
    <div className="space-y-6 pt-4">
      {/* SPECIAL stats */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold tracking-wide">SPECIAL (Base)</h3>
        <div className="space-y-2">
          {SPECIAL_ORDER.map((letter, i) => {
            const value = baseOf(i);
            const inputId = `special-${letter}`;
            return (
              <div key={letter} className="flex items-center gap-3">
                <label htmlFor={inputId} className="flex items-center justify-center w-7">
                  <SpecialIcon letter={letter} size={24} detail={`Current: ${value}/10`} />
                </label>
                <input
                  id={inputId}
                  type="number"
                  aria-label={letter}
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) => updateRaw((d) => setStat(d, letter, Number(e.target.value)))}
                  className="w-16 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center"
                />
                <input
                  type="range"
                  aria-hidden="true"
                  tabIndex={-1}
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) => updateRaw((d) => setStat(d, letter, Number(e.target.value)))}
                  className="flex-1 accent-emerald-500"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Read-only: base SPECIAL combined with the equipped outfit's bonus */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 className="text-zinc-300 text-sm font-semibold tracking-wide">SPECIAL (with Outfit)</h3>
          <span className="text-xs text-zinc-400 truncate">
            {outfitLabel ? <>Wearing <span className="text-green-400">{outfitLabel}</span></> : 'No outfit'}
          </span>
        </div>
        <table className="w-full text-sm" aria-label="SPECIAL with outfit bonus">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="w-7 font-normal text-left"><span className="sr-only">Stat</span></th>
              <th className="w-14 font-normal text-center">Base</th>
              <th className="w-14 font-normal text-center">Outfit</th>
              <th className="w-14 font-normal text-center">Total</th>
              <th className="font-normal"><span className="sr-only">Breakdown</span></th>
            </tr>
          </thead>
          <tbody>
            {SPECIAL_ORDER.map((letter, i) => {
              const base = baseOf(i);
              const extra = bonus[letter] ?? 0;
              const total = base + extra;
              return (
                <tr key={letter} className="transition-colors hover:bg-zinc-700/50">
                  <td className="py-1">
                    <SpecialIcon letter={letter} size={24} detail={`${base} base${extra ? ` + ${extra} outfit` : ''} = ${total}`} />
                  </td>
                  <td className="text-center text-zinc-300 font-mono">{base}</td>
                  <td className={`text-center font-mono ${extra ? 'text-sky-400' : 'text-zinc-600'}`}>
                    {extra ? `+${extra}` : '—'}
                  </td>
                  <td className={`text-center font-mono font-semibold ${extra ? 'text-sky-300' : 'text-zinc-100'}`}>{total}</td>
                  <td className="pl-2">
                    <div className="flex h-2 rounded-full bg-zinc-700 overflow-hidden" aria-hidden="true">
                      <div className="h-full bg-emerald-500" style={{ width: `${(Math.min(base, MAX_TOTAL) / MAX_TOTAL) * 100}%` }} />
                      {extra > 0 && (
                        <div className="h-full bg-sky-500" style={{ width: `${(Math.min(extra, MAX_TOTAL - base) / MAX_TOTAL) * 100}%` }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-zinc-500">
          Tip: base SPECIAL caps at 10, but outfits can push a stat past it, up to 17 (10 base + 7 from a legendary outfit).
        </p>
      </div>
    </div>
  );
}
