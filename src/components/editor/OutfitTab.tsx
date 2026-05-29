import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { piecesOfType } from '../../lib/spriteIndex';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller, Rgb } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';

const SKIN_COLORS: Rgb[] = [
  { r: 255, g: 224, b: 196 }, { r: 240, g: 200, b: 160 }, { r: 200, g: 150, b: 110 },
  { r: 150, g: 100, b: 70 }, { r: 100, g: 65, b: 45 }, { r: 70, g: 45, b: 30 },
];
const OUTFIT_COLORS: Rgb[] = [
  { r: 40, g: 60, b: 140 }, { r: 140, g: 40, b: 40 }, { r: 40, g: 110, b: 60 },
  { r: 120, g: 120, b: 120 }, { r: 30, g: 30, b: 30 }, { r: 200, g: 170, b: 60 },
];

export function OutfitTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const gender = dweller.gender === 2 ? 'male' : 'female';
  const options = piecesOfType(index, 'outfit', { gender }).map((p) => ({ value: p.name, label: p.name }));
  return (
    <div className="space-y-4">
      <OptionGrid options={options} selected={dweller.outfitName ?? null} onSelect={(v) => onChange({ outfitId: v })} />
      <ColorPalette
        label="Outfit color"
        value={dweller.outfitColor ?? { r: 0, g: 0, b: 0 }}
        swatches={OUTFIT_COLORS}
        onChange={(c) => onChange({ outfitColor: c })}
      />
      <ColorPalette
        label="Skin color"
        value={dweller.skinColor ?? { r: 255, g: 224, b: 196 }}
        swatches={SKIN_COLORS}
        onChange={(c) => onChange({ skinColor: c })}
      />
    </div>
  );
}
