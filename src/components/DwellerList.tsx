import { useSaveStore } from '../store/saveStore';

export function DwellerList() {
  const save = useSaveStore((s) => s.save);
  const selectedId = useSaveStore((s) => s.selectedDwellerId);
  const selectDweller = useSaveStore((s) => s.selectDweller);

  if (!save) {
    return <div className="text-zinc-400 italic">Import a save to see dwellers.</div>;
  }

  const dwellers = save.dwellers.dwellers;

  return (
    <div className="border border-zinc-700 rounded divide-y divide-zinc-800 max-h-[60vh] overflow-y-auto">
      {dwellers.map((d) => {
        const level = d.experience?.currentLevel ?? 1;
        const isSelected = d.serializeId === selectedId;
        return (
          <button
            key={d.serializeId}
            onClick={() => selectDweller(d.serializeId)}
            className={`w-full text-left px-3 py-2 hover:bg-zinc-800 ${
              isSelected ? 'bg-zinc-800' : ''
            }`}
          >
            <div className="font-medium">
              {d.name} {d.lastName}
            </div>
            <div className="text-xs text-zinc-400">
              Lv {level} · {d.gender === 2 ? 'M' : 'F'} · #{d.serializeId}
            </div>
          </button>
        );
      })}
    </div>
  );
}
