// src/components/ExportSuccessModal.tsx
import { useEffect } from 'react';
import { GITHUB_REPO_URL } from '../lib/constants';
import { GitHubIcon } from './GitHubIcon';

interface Props {
  open: boolean;
  isDemo: boolean;
  onClose: () => void;
}

export function ExportSuccessModal({ open, isDemo, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-success-title"
        className="relative flex flex-col items-center gap-4 w-80 p-6 bg-zinc-800 rounded-xl shadow-xl text-center"
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
        <h2 id="export-success-title" className="text-lg font-bold">Save exported!</h2>
        {isDemo && (
          <p className="text-sm text-amber-400">
            This demo save may not be compatible with your game version.
          </p>
        )}
        <p className="text-sm text-zinc-400">
          If this tool helped you, consider leaving a star on GitHub. It is completely free and open source.
        </p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded font-medium text-sm transition-colors"
        >
          <GitHubIcon size={16} />
          Star on GitHub
        </a>
      </div>
    </div>
  );
}
