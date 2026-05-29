import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { piecesOfType } from '../../lib/spriteIndex';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller, Rgb } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';

const HAIR_COLORS: Rgb[] = [
  { r: 30, g: 22, b: 18 }, { r: 80, g: 50, b: 30 }, { r: 150, g: 95, b: 45 },
  { r: 200, g: 160, b: 90 }, { r: 120, g: 30, b: 20 }, { r: 220, g: 220, b: 220 },
];

export function HairTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const gender = dweller.gender === 2 ? 'male' : 'female';
  const options = piecesOfType(index, 'hair', { gender }).map((p) => ({ value: p.name, label: p.name }));
  return (
    <div className="space-y-4">
      <OptionGrid options={options} selected={dweller.hairName ?? null} onSelect={(v) => onChange({ hair: v })} />
      <ColorPalette
        label="Hair color"
        value={dweller.hairColor ?? { r: 0, g: 0, b: 0 }}
        swatches={HAIR_COLORS}
        onChange={(c) => onChange({ hairColor: c })}
      />
    </div>
  );
}
