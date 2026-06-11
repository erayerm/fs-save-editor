import { useEffect, useRef, useState } from 'react';
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
  // The native color map fires onChange continuously while dragging. Committing
  // each tick to the store re-renders the whole editor + redraws the avatar (WebGL),
  // which makes dragging feel laggy. So we show the dragged color locally right away
  // (cheap) but debounce the actual onChange commit.
  const [preview, setPreview] = useState<Rgb | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Once the committed value catches up (or the dweller changes), drop the preview.
  const valueHex = toHex(value);
  useEffect(() => { setPreview(null); }, [valueHex]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handlePick = (c: Rgb) => {
    setPreview(c); // immediate, cheap visual feedback
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeRef.current(c), 80);
  };

  const commitNow = (c: Rgb) => {
    if (timer.current) clearTimeout(timer.current);
    onChange(c);
  };

  const shown = preview ?? value;

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="flex flex-wrap gap-1">
        {/* Custom color picker, pinned first: shows the current selection as its
            background with the standard eyedropper icon overlaid. Clicking opens
            the native color map. */}
        <label
          aria-label={`${label} custom`}
          title="Pick a custom color"
          style={{ backgroundColor: toHex(shown) }}
          className="relative w-6 h-6 rounded border border-zinc-600 cursor-pointer overflow-hidden"
        >
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            {(() => {
              const paths = (
                <>
                  <path d="m2 22 1-1h3l9-9" />
                  <path d="M3 21v-3l9-9" />
                  <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
                </>
              );
              return (
                <span className="relative block w-3.5 h-3.5">
                  {/* Black outline behind (thicker stroke) + white icon on top, so the
                      eyedropper stays legible over any selected color. */}
                  <svg className="absolute inset-0 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
                  <svg className="absolute inset-0 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
                </span>
              );
            })()}
          </span>
          <input
            type="color"
            value={toHex(shown)}
            onChange={(e) => handlePick(fromHex(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        {swatches.map((s, i) => (
          <button
            key={i}
            aria-label={`${label} swatch ${i}`}
            onClick={() => commitNow(s)}
            style={{ backgroundColor: toHex(s) }}
            className="w-6 h-6 rounded border border-zinc-600"
          />
        ))}
      </div>
    </div>
  );
}
