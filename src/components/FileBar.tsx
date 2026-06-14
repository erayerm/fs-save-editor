import { useRef } from 'react';
import { decodeSav } from '../lib/savFile';
import { exportSave } from '../lib/exportSave';
import { useSaveStore } from '../store/saveStore';

export function FileBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { save, fileName, setSave, clear } = useSaveStore();

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

  async function onExport() {
    if (!save) return;
    await exportSave(save, fileName);
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded">
      <input
        ref={inputRef}
        type="file"
        accept=".sav"
        className="hidden"
        onChange={onPick}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded"
      >
        Import .sav
      </button>
      <button
        onClick={onExport}
        disabled={!save}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded"
      >
        Export .sav
      </button>
      <button
        onClick={clear}
        disabled={!save}
        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:text-zinc-500 rounded"
      >
        Close
      </button>
      <span className="text-zinc-400 text-sm">{fileName ?? 'No file loaded'}</span>
    </div>
  );
}
