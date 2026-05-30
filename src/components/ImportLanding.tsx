import { useRef } from 'react';
import { decodeSav } from '../lib/savFile';
import { useSaveStore } from '../store/saveStore';

export function ImportLanding() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setSave = useSaveStore((s) => s.setSave);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const data = await decodeSav(text);
      setSave(data, f.name);
    } catch (err) {
      alert(`Failed to decode .sav: ${(err as Error).message}`);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="flex flex-col items-center gap-6 p-10 bg-zinc-800 rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">fs-save-editor</h1>
        <p className="text-zinc-400 text-sm">Load a Fallout Shelter .sav file to get started.</p>
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
    </div>
  );
}
