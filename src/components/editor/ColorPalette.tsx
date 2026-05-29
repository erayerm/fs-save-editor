import type { Rgb } from '../../lib/dwellerRender';

const toHex = (c: Rgb) =>
  '#' + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string): Rgb => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

export function ColorPalette({
  label, value, swatches, onChange,
}: {
  label: string;
  value: Rgb;
  swatches: Rgb[];
  onChange: (c: Rgb) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="flex flex-wrap gap-1">
        {swatches.map((s, i) => (
          <button
            key={i}
            aria-label={`${label} swatch ${i}`}
            onClick={() => onChange(s)}
            style={{ backgroundColor: toHex(s) }}
            className="w-6 h-6 rounded border border-zinc-600"
          />
        ))}
        <input
          type="color"
          aria-label={`${label} custom`}
          value={toHex(value)}
          onChange={(e) => onChange(fromHex(e.target.value))}
          className="w-6 h-6 rounded border border-zinc-600 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
