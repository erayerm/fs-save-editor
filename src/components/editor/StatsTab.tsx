import { useSaveStore } from '../../store/saveStore';
import { setStat } from '../../lib/dwellerEdit';
import { SPECIAL_ORDER } from '../../types/save';
import { SpecialIcon } from '../SpecialIcon';
import type { RenderableDweller } from '../../lib/dwellerRender';

export function StatsTab({ dweller }: { dweller: RenderableDweller }) {
  const sel = useSaveStore((s) => s.getSelectedDweller());
  const updateRaw = useSaveStore((s) => s.updateSelectedDwellerRaw);

  const disabled = !!dweller.isChild;

  return (
    <div className="space-y-6">
      {/* SPECIAL stats */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">SPECIAL</h3>
        <div className="space-y-2">
          {SPECIAL_ORDER.map((letter, i) => {
            const value = sel?.stats?.stats?.[i + 1]?.value ?? 1;
            const inputId = `special-${letter}`;
            return (
              <div key={letter} className="flex items-center gap-3">
                <label htmlFor={inputId} className="flex items-center justify-center w-7" title={letter}>
                  <SpecialIcon letter={letter} size={24} title={letter} />
                </label>
                <input
                  id={inputId}
                  type="number"
                  aria-label={letter}
                  min={1}
                  max={10}
                  disabled={disabled}
                  value={value}
                  onChange={(e) =>
                    updateRaw((d) => setStat(d, letter, Number(e.target.value)))
                  }
                  className="w-16 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center disabled:opacity-50"
                />
                <input
                  type="range"
                  aria-hidden="true"
                  tabIndex={-1}
                  min={1}
                  max={10}
                  disabled={disabled}
                  value={value}
                  onChange={(e) =>
                    updateRaw((d) => setStat(d, letter, Number(e.target.value)))
                  }
                  className="flex-1 accent-emerald-500 disabled:opacity-50"
                />
                <span className="w-6 text-right text-zinc-400 text-sm">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
