// src/components/DisclaimerModal.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DisclaimerModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        className="relative flex flex-col gap-3 w-[28rem] max-w-[calc(100vw-2rem)] p-6 bg-zinc-800 rounded-xl shadow-xl text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 id="disclaimer-title" className="text-lg font-bold">Disclaimer</h2>
        <div className="flex flex-col gap-2 text-sm text-zinc-400">
          <p>
            FS Save Editor is an unofficial, fan-made tool. It is not affiliated with, endorsed by,
            or in any way connected to Bethesda Softworks, Behaviour Interactive, or ZeniMax Media.
            Fallout and Fallout Shelter are trademarks of their respective owners.
          </p>
          <p>
            This tool only modifies data inside save files that you load from your own device.
            It does not connect to any game servers and it does not distribute any game files,
            assets, or paid content. All game data shown belongs to its respective owners.
          </p>
          <p>
            Use this tool at your own risk. Modifying save files may corrupt your save, may affect
            your game experience, and may violate the game's terms of service, including its rules
            on purchasable items. Always keep a backup of your original save file. You are solely
            responsible for how you use this tool and for any changes you make.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
