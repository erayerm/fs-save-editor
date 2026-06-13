import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Centered modal warning the user about an equipped item the editor's catalog
 * doesn't recognize (almost certainly content the game added after this editor's
 * last update). Two modes:
 *  - 'info'    : the user clicked the warning badge — purely informational.
 *  - 'confirm' : the user is about to replace the unknown item — must confirm,
 *                because the original value can't be restored afterwards.
 */
export function UnknownItemModal({
  open, itemId, mode, onCancel, onConfirm,
}: {
  open: boolean;
  itemId: string;
  mode: 'info' | 'confirm';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unsupported item"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" width="22" height="22" className="text-amber-400 shrink-0" aria-hidden="true"
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2 className="text-lg font-semibold text-zinc-100">Unsupported item</h2>
        </div>
        <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
          This character has the item <span className="font-semibold text-amber-300 break-all">{itemId}</span>,
          which must have been added to the game after this editor was last updated — so it can't be displayed
          correctly. If you change it, you won't be able to set it back to this item, so make sure you want to
          do this before continuing.
        </p>
        <div className="flex justify-end gap-2">
          {mode === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-3 py-1.5 rounded text-sm font-medium text-zinc-900 bg-amber-400 hover:bg-amber-300"
              >
                Replace anyway
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Drives the unknown-item modal for a picker. `currentId` is the equipped item's
 * save id; `known` is whether that id appears in the picker's catalog list.
 *
 * - `isUnknown`    : show the pinned warning card and guard changes.
 * - `openInfo()`   : open the informational modal (warning-badge click).
 * - `guardSelect()`: wrap an item-change; when the current item is unknown it
 *                    asks for confirmation first, otherwise applies immediately.
 * - `modal`        : render this node somewhere in the picker.
 */
export function useUnknownItemGuard(currentId: string | null | undefined, known: boolean) {
  const isUnknown = !!currentId && !known;
  const [state, setState] = useState<{ mode: 'info' | 'confirm'; onConfirm?: () => void } | null>(null);

  const openInfo = () => setState({ mode: 'info' });
  const guardSelect = (apply: () => void) => {
    if (isUnknown) setState({ mode: 'confirm', onConfirm: apply });
    else apply();
  };

  const modal = (
    <UnknownItemModal
      open={!!state}
      itemId={currentId ?? ''}
      mode={state?.mode ?? 'info'}
      onCancel={() => setState(null)}
      onConfirm={() => { state?.onConfirm?.(); setState(null); }}
    />
  );

  return { isUnknown, openInfo, guardSelect, modal };
}
