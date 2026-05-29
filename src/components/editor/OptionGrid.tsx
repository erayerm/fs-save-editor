export interface GridOption {
  value: string;
  label: string;
}

export function OptionGrid({
  options, selected, onSelect,
}: {
  options: GridOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) {
    return <div className="text-zinc-500 italic text-sm p-2">No options available.</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-96 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === selected}
          onClick={() => onSelect(o.value)}
          className={
            'h-16 rounded border text-xs flex items-center justify-center text-center px-1 ' +
            (o.value === selected
              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 text-zinc-300')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
