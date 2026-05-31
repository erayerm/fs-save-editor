import { useRef, useState } from 'react';
import { decodeSav } from '../lib/savFile';
import { useSaveStore } from '../store/saveStore';

export function ImportLanding() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setSave = useSaveStore((s) => s.setSave);
  const [dragging, setDragging] = useState(false);
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
        <h1 className="text-3xl font-bold tracking-tight">fs-save-editor</h1>
        <p className="text-zinc-400 text-sm">
          Load a Fallout Shelter .sav file to get started — click below or drop the file anywhere.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".sav"
          className="hidden"
          onChange={onPick}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded font-medium transition-colors"
        >
          Import .sav
        </button>
      </div>

      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/80 border-4 border-dashed border-emerald-500 pointer-events-none">
          <div className="text-2xl font-semibold text-emerald-300">Drop your .sav file to load it</div>
        </div>
      )}
    </div>
  );
}
