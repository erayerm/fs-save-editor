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
    <div className="flex flex-col gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          aria-pressed={t.id === active}
          onClick={() => onSelect(t.id)}
          className={
            'px-4 py-2 rounded text-sm text-left ' +
            (t.id === active
              ? 'bg-emerald-700 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
