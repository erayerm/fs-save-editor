import type { Rgb } from '../lib/dwellerRender';

const h2 = (n: number) => n.toString(16).padStart(2, '0');

export function rgbToHex(c: Rgb): string {
  return `#${h2(c.r)}${h2(c.g)}${h2(c.b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, a: 255 };
}

interface ColorPickerProps {
  label: string;
  value: Rgb | undefined;
  onChange: (c: Rgb) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const hex = value ? rgbToHex(value) : '#ffffff';
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-16 text-zinc-400">{label}</span>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(hexToRgb(e.target.value))}
        className="h-7 w-12 bg-transparent border border-zinc-700 rounded"
      />
    </label>
  );
}
