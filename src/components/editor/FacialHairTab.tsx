import { OptionGrid } from './OptionGrid';
import { ColorPalette } from './ColorPalette';
import { facialHairPieces } from '../../lib/spriteIndex';
import { HAIR_PRESETS } from '../../lib/colorPresets';
import type { SpriteIndex } from '../../types/pieces';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';

// Sentinel grid value for the "no facial hair" choice (maps to a null save value).
const NONE = '__none__';
const CELL = 80;

// Male facial-hair (beard/mustache) customization. The chosen piece persists on the
// dweller's `faceMask` save key. Thumbnails are deferred for v1 — a labeled grid is used.
export function FacialHairTab({
  index, dweller, onChange,
}: {
  index: SpriteIndex;
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
}) {
  const hairColor = dweller.hairColor ?? { r: 150, g: 95, b: 45 };

  const options = [
    { value: NONE, label: 'None' },
    ...facialHairPieces(index).map((p) => ({ value: p.name, label: p.name })),
  ];

  return (
    <div className="space-y-4">
      <OptionGrid
        options={options}
        selected={dweller.facialHair ?? NONE}
        onSelect={(v) => onChange({ facialHair: v === NONE ? null : v })}
        cellW={CELL}
        cellH={CELL}
      />
      <ColorPalette
        label="Facial hair color"
        value={hairColor}
        swatches={HAIR_PRESETS}
        onChange={(c) => onChange({ hairColor: c })}
      />
    </div>
  );
}
