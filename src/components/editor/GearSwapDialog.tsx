import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { editDweller, useSaveStore } from '../../store/saveStore';
import { canStash, getStashItems, replacedGear, stashCapacity, type StashItem } from '../../lib/stash';
import { petLimitError } from '../../lib/petLimits';
import { describeStashItem, useItemCatalogs } from '../StashItemInfo';
import type { Dweller } from '../../types/save';

interface PendingSwap {
  fn: (d: Dweller) => Dweller;
  removed: StashItem[];
}

const usePendingSwap = create<{ pending: PendingSwap | null }>(() => ({ pending: null }));

/**
 * Apply an edit to the selected dweller. If it would take off a weapon or outfit
 * (other than the default Fist / jumpsuit), ask via <GearSwapDialog> whether to
 * stash or discard it first; otherwise apply immediately.
 */
export function requestGearChange(fn: (d: Dweller) => Dweller): void {
  const store = useSaveStore.getState();
  const d = store.getSelectedDweller();
  if (!d) return;
  const removed = replacedGear(d, fn(d));
  if (removed.length === 0) store.updateSelectedDwellerRaw(fn);
  else usePendingSwap.setState({ pending: { fn, removed } });
}

/** Stash-or-discard prompt for requestGearChange. Mount once in the dweller editor. */
export function GearSwapDialog() {
  const pending = usePendingSwap((s) => s.pending);
  const save = useSaveStore((s) => s.save);
  const dwellerId = useSaveStore((s) => s.selectedDwellerId);
  const swap = useSaveStore((s) => s.swapSelectedGear);
  const catalogs = useItemCatalogs();

  const close = () => usePendingSwap.setState({ pending: null });

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  if (!pending || !save || dwellerId === null) return null;

  const used = getStashItems(save).length;
  const capacity = stashCapacity(save);
  const fits = canStash(save, pending.removed.length);
  const petError = (stash: boolean) => {
    const next = editDweller(save, dwellerId, pending.fn, stash);
    return next ? petLimitError(save, next) : null;
  };
  const stashPetError = fits ? petError(true) : null;
  const discardPetError = petError(false);
  const names = pending.removed.map((it) => describeStashItem(it, catalogs).name);
  const apply = (stash: boolean) => { swap(pending.fn, stash); close(); };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stash or discard"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Stash or discard?</h2>
        <p className="text-sm text-zinc-300 mb-3">
          This change unequips{' '}
          {names.map((n, i) => (
            <span key={i}>
              {i > 0 && ' and '}
              <span className="font-semibold text-green-400">{n}</span>
            </span>
          ))}
          . Move it to the vault stash, or discard it?
        </p>
        <p className={`text-xs mb-5 ${fits && !stashPetError ? 'text-zinc-500' : 'text-amber-400'}`}>
          {!fits
            ? `The stash is full (${used} / ${capacity}). Free up space in Vault Settings, or discard the item.`
            : stashPetError
              ? `${stashPetError} Discard the old pet instead.`
              : `Stash: ${used} / ${capacity} used.`}
        </p>
        {discardPetError && (
          <p className="text-xs text-amber-400 -mt-3 mb-5">{discardPetError}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => apply(false)}
            disabled={!!discardPetError}
            className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:hover:bg-red-600 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => apply(true)}
            disabled={!fits || !!stashPetError}
            className="px-3 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 disabled:hover:bg-green-600 disabled:cursor-not-allowed"
          >
            Stash
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
