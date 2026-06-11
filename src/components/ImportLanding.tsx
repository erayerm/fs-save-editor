import { useRef, useState } from 'react';
import { decodeSav } from '../lib/savFile';
import { useSaveStore } from '../store/saveStore';
import { GITHUB_REPO_URL } from '../lib/constants';
import { GitHubIcon } from './GitHubIcon';
import { DisclaimerModal } from './DisclaimerModal';

export function ImportLanding() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setSave = useSaveStore((s) => s.setSave);
  const [dragging, setDragging] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  // Track nested drag enter/leave so child elements don't flicker the overlay.
  const dragDepth = useRef(0);

  async function loadFile(f: File) {
    const text = await f.text();
    try {
      const data = await decodeSav(text);
      setSave(data, f.name);
    } catch (err) {
      alert(`Failed to decode .sav: ${(err as Error).message}`);
    }
  }

  async function loadDemo() {
    try {
      const res = await fetch('/demo.sav');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const data = await decodeSav(text);
      setSave(data, 'demo.sav', { isDemo: true });
    } catch (err) {
      alert(`Failed to load the demo save: ${(err as Error).message}`);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await loadFile(f);
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await loadFile(f);
  }

  return (
    <div
      className="relative h-screen flex items-center justify-center bg-zinc-900 text-zinc-100"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center gap-6 p-10 bg-zinc-800 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">FS Save Editor</h1>
        <p className="text-zinc-400 text-sm">
          Load a Fallout Shelter .sav file to get started, or try the demo. Click below or drop the file anywhere.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".sav"
          className="hidden"
          onChange={onPick}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded font-medium transition-colors"
          >
            Import .sav
          </button>
          <button
            onClick={loadDemo}
            className="px-5 py-2.5 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded font-medium transition-colors"
          >
            Try the demo
          </button>
        </div>
        <div className="flex items-center justify-center gap-5 w-full pt-4 border-t border-zinc-700 text-sm">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <GitHubIcon size={16} />
            Open source on GitHub
          </a>
          <button
            onClick={() => setDisclaimerOpen(true)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Disclaimer
          </button>
        </div>
      </div>

      <DisclaimerModal open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />

      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/80 border-4 border-dashed border-emerald-500 pointer-events-none">
          <div className="text-2xl font-semibold text-emerald-300">Drop your .sav file to load it</div>
        </div>
      )}
    </div>
  );
}
