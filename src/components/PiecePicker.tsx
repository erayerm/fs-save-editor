interface PiecePickerProps {
  label: string;
  options: { name: string; label?: string }[];
  value: string | undefined;
  onChange: (name: string) => void;
}

export function PiecePicker({ label, options, value, onChange }: PiecePickerProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-16 text-zinc-400">{label}</span>
      <select
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
        value={options.some((o) => o.name === value) ? value : (options[0]?.name ?? '')}
        disabled={options.length === 0}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.name} value={o.name}>{o.label ?? o.name}</option>
        ))}
      </select>
    </label>
  );
}
