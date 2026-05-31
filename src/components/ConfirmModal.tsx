import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lightweight centered confirmation modal. Renders a dimmed backdrop with a
 * dialog; Escape or a backdrop click cancels. Used e.g. to confirm evicting a
 * dweller. Render conditionally by the parent (returns null when not open).
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass = danger
    ? 'bg-red-600 hover:bg-red-500'
    : 'bg-green-600 hover:bg-green-500';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h2>
        <div className="text-sm text-zinc-300 mb-5">{message}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded text-sm font-medium text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
