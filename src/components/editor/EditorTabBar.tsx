export interface EditorTab {
  id: string;
  label: string;
}

export function EditorTabBar({
  tabs, active, onSelect,
}: {
  tabs: EditorTab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-end gap-1 border-b border-zinc-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          aria-pressed={t.id === active}
          onClick={() => onSelect(t.id)}
          className={
            'px-4 py-2 text-sm rounded-t-lg border border-b-0 -mb-px ' +
            (t.id === active
              ? 'bg-zinc-800 text-white border-zinc-600'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
