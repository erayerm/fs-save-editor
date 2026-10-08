import { useSaveStore } from '../../store/saveStore';
import { getStashItems, stashCapacity } from '../../lib/stash';
import { CapacityBar } from '../StashPanel';

/**
 * Top of the gear pickers' Stash view. The dweller's equipped item is shown
 * here, apart from the stash grid, because it isn't in the stash; next to it
 * is the stash's used / capacity.
 */
export function StashViewHeader({ name, icon, detail, warning, onUnequip }: {
  name: string;
  icon?: React.ReactNode;
  detail?: React.ReactNode;
  /** Shown in place of `detail`, e.g. for an item the editor doesn't recognize. */
  warning?: string;
  /** Swap back to the default Fist / jumpsuit / no pet; omit when that's already the case. */
  onUnequip?: () => void;
}) {
  const save = useSaveStore((s) => s.save);
  if (!save) return null;
  const used = getStashItems(save).length;
  const capacity = stashCapacity(save);
  const full = used >= capacity;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 mb-2">
      <div
        data-selected
        className="flex items-center gap-3 min-w-0 rounded border border-green-400/60 bg-green-950/30 py-1 pl-1.5 pr-2"
      >
        <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden">{icon}</div>
        <div className="min-w-0 leading-tight">
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">Equipped · not in stash</div>
          <div className="text-sm font-medium text-green-400 truncate" title={name}>{name}</div>
          {warning
            ? <div className="text-[11px] text-amber-400">{warning}</div>
            : detail && <div className="text-[11px] text-zinc-400">{detail}</div>}
        </div>
        {onUnequip && (
          <button
            type="button"
            onClick={onUnequip}
            title="Take it off; you'll choose whether to stash or discard it"
            className="ml-2 shrink-0 h-7 px-2.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors"
          >
            Unequip
          </button>
        )}
      </div>

      <div className="ml-auto flex flex-col items-end gap-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-400">Stash capacity</span>
          <CapacityBar used={used} capacity={capacity} />
        </div>
        {full && (
          <span className="text-xs text-red-400">The stash is full; unequipped items can only be discarded.</span>
        )}
      </div>
    </div>
  );
}
