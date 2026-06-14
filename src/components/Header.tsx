import { useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import { exportSave } from '../lib/exportSave';
import { countExport } from '../lib/analytics';
import { GITHUB_REPO_URL } from '../lib/constants';
import { GitHubIcon } from './GitHubIcon';
import { ExportSuccessModal } from './ExportSuccessModal';
import { DisclaimerModal } from './DisclaimerModal';

export function Header() {
  const save = useSaveStore((s) => s.save);
  const fileName = useSaveStore((s) => s.fileName);
  const clear = useSaveStore((s) => s.clear);
  const page = useSaveStore((s) => s.page);
  const setPage = useSaveStore((s) => s.setPage);
  const isDemo = useSaveStore((s) => s.isDemo);
  const [exportedOpen, setExportedOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  // Modern header navigation: borderless links with a tapered (fading-ends) green
  // underline marking the active page, rather than filled button chips.
  const navClass = (active: boolean) =>
    'relative pb-1 text-sm font-medium transition-colors ' +
    (active ? 'text-white' : 'text-zinc-400 hover:text-zinc-100');

  // Thin (1px) underline, solid through the middle 60% and fading out over the
  // outer 20% on each side, in a darker green.
  const Underline = () => (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
      style={{ background: 'linear-gradient(to right, transparent 0%, #15803d 20%, #15803d 80%, transparent 100%)' }}
    />
  );

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-zinc-800 border-b border-zinc-700 shrink-0">
      <div className="flex items-center gap-5">
        <h1 className="text-xl font-bold tracking-tight">FS Save Editor</h1>
        {/* Vertical separator: solid through the middle, fading out over the outer 20%. */}
        <div
          className="h-6 w-px"
          aria-hidden="true"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, #71717a 20%, #71717a 80%, transparent 100%)' }}
        />
        <nav className="flex items-center gap-6 mt-1">
          <button onClick={() => setPage('dweller')} className={navClass(page === 'dweller')}>
            Dweller Settings
            {page === 'dweller' && <Underline />}
          </button>
          <button onClick={() => setPage('vault')} className={navClass(page === 'vault')}>
            Vault Settings
            {page === 'vault' && <Underline />}
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDisclaimerOpen(true)}
          className="px-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          Disclaimer
        </button>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          title="View on GitHub"
          className="flex items-center justify-center w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white transition-colors"
        >
          <GitHubIcon size={16} />
        </a>
        <button
          onClick={async () => {
            if (!save) return;
            try {
              await exportSave(save, fileName);
              countExport(isDemo);
              setExportedOpen(true);
            } catch (err) {
              alert(`Failed to export .sav: ${(err as Error).message}`);
            }
          }}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
        >
          Export .sav file
        </button>
        <button
          onClick={clear}
          aria-label="Change .sav file"
          title="Change .sav file"
          className="flex items-center justify-center w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <ExportSuccessModal open={exportedOpen} isDemo={isDemo} onClose={() => setExportedOpen(false)} />
      <DisclaimerModal open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />
    </header>
  );
}
