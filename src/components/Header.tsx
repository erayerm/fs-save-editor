import { useSaveStore } from '../store/saveStore';
import { exportSave } from '../lib/exportSave';

export function Header() {
  const save = useSaveStore((s) => s.save);
  const fileName = useSaveStore((s) => s.fileName);
  const clear = useSaveStore((s) => s.clear);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-zinc-800 border-b border-zinc-700 shrink-0">
      <h1 className="text-xl font-bold tracking-tight">fs-save-editor</h1>
      <div className="flex items-center gap-3">
        {fileName && <span className="text-zinc-400 text-sm">{fileName}</span>}
        <button
          onClick={() => save && exportSave(save, fileName)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
        >
          Export .sav file
        </button>
        <button
          onClick={clear}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium transition-colors"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
