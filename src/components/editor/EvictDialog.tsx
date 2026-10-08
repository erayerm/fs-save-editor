import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSaveStore } from '../../store/saveStore';
import { canStash, equippedGear, getStashItems, stashCapacity } from '../../lib/stash';
import { describeStashItem, useItemCatalogs } from '../StashItemInfo';
import type { Dweller } from '../../types/save';

/**
 * Confirm evicting `dweller`. When it has a weapon, outfit or pet equipped
 * (other than the default Fist / jumpsuit), offers to move them to the vault
 * stash or discard them along with the dweller.
 */
export function EvictDialog({ dweller, onClose }: { dweller: Dweller | null; onClose: () => void }) {
  const save = useSaveStore((s) => s.save);
  const removeDweller = useSaveStore((s) => s.removeDweller);
  const catalogs = useItemCatalogs();

  useEffect(() => {
    if (!dweller) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dweller, onClose]);

  if (!dweller || !save) return null;

  const fullName = `${dweller.name ?? ''} ${dweller.lastName ?? ''}`.trim() || 'this dweller';
  const gear = equippedGear(dweller);
  const used = getStashItems(save).length;
  const capacity = stashCapacity(save);
  const fits = canStash(save, gear.length);
  const evict = (stashGear: boolean) => { removeDweller(dweller.serializeId, { stashGear }); onClose(); };
  const btn = 'px-3 py-1.5 rounded text-sm font-medium';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Evict Dweller"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Evict Dweller</h2>
        <p className="text-sm text-zinc-300 mb-3">
          Are you sure you want to evict <span className="font-semibold text-zinc-100">{fullName}</span>?
          This permanently removes them from the vault.
        </p>

        {gear.length > 0 && (
          <>
            <p className="text-sm text-zinc-300 mb-2">They have equipped:</p>
            <ul className="mb-3 space-y-1">
              {gear.map((it, i) => (
                <li key={i} className="text-sm">
                  <span className="text-zinc-500 mr-2">{it.type}</span>
                  <span className="font-semibold text-green-400">{describeStashItem(it, catalogs).name}</span>
                </li>
              ))}
            </ul>
            <p className={`text-xs mb-5 ${fits ? 'text-zinc-500' : 'text-amber-400'}`}>
              {fits
                ? `Move them to the vault stash, or discard them with the dweller. Stash: ${used} / ${capacity} used.`
                : `The stash is full (${used} / ${capacity}); ${gear.length} free slot${gear.length === 1 ? '' : 's'} needed. Free up space in Vault Settings, or discard the items.`}
            </p>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className={`${btn} bg-zinc-700 hover:bg-zinc-600 text-zinc-200`}>
            Cancel
          </button>
          {gear.length === 0 ? (
            <button type="button" onClick={() => evict(false)}
              className={`${btn} bg-red-600 hover:bg-red-500 text-white`}>
              Evict
            </button>
          ) : (
            <>
              <button type="button" onClick={() => evict(false)}
                className={`${btn} bg-red-600 hover:bg-red-500 text-white`}>
                Evict &amp; discard
              </button>
              <button type="button" onClick={() => evict(true)} disabled={!fits}
                className={`${btn} bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 disabled:hover:bg-green-600 disabled:cursor-not-allowed`}>
                Evict &amp; stash
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
