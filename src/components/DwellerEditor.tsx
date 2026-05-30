import { useState, useEffect } from 'react';
import { DwellerCanvas } from './DwellerCanvas';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { FacialHairTab } from './editor/FacialHairTab';
import { OutfitTab } from './editor/OutfitTab';
import { WeaponTab } from './editor/WeaponTab';
import { StatsTab } from './editor/StatsTab';
import { ColorPalette } from './editor/ColorPalette';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { useSaveStore } from '../store/saveStore';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { DwellerCustomization } from '../lib/dwellerEdit';
import { SKIN_PRESETS } from '../lib/colorPresets';

export function DwellerEditor({ dweller }: { dweller: RenderableDweller }) {
  const [active, setActive] = useState('hair');
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useSaveStore((s) => s.updateSelectedDweller);

  useEffect(() => { loadSpriteIndex().then(setIndex).catch((e) => setError(e.message)); }, []);

  const onChange = (patch: DwellerCustomization) => update(patch);

  if (dweller.isChild) {
    return (
      <div className="flex gap-6">
        <DwellerCanvas dweller={dweller} size={360} />
        <div className="text-zinc-400 italic self-center">
          Child dwellers cannot be customized.
        </div>
      </div>
    );
  }

  // Facial hair is male-only (and never for children, who are excluded above).
  const isMale = dweller.gender === 2;
  const tabs: EditorTab[] = [
    { id: 'hair', label: 'Hair' },
    ...(isMale ? [{ id: 'facialHair', label: 'Facial Hair' }] : []),
    { id: 'outfit', label: 'Outfit' },
    { id: 'weapon', label: 'Weapon' },
    { id: 'stats', label: 'SPECIAL' },
  ];

  return (
    <div className="flex gap-6">
      {/* Left: portrait + skin color always visible */}
      <div className="flex-shrink-0 space-y-3">
        <DwellerCanvas dweller={dweller} size={300} />
        <ColorPalette
          label="Skin color"
          value={dweller.skinColor ?? { r: 255, g: 224, b: 196 }}
          swatches={SKIN_PRESETS}
          onChange={(c) => onChange({ skinColor: c })}
        />
      </div>

      {/* Right: tab switcher + tab content */}
      <div className="flex gap-4 flex-1 min-w-0">
        <EditorTabBar tabs={tabs} active={active} onSelect={setActive} />
        <div className="flex-1 min-w-0">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && active === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && active === 'facialHair' && isMale && <FacialHairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && active === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
          {active === 'weapon' && <WeaponTab dweller={dweller} />}
          {active === 'stats' && <StatsTab dweller={dweller} />}
        </div>
      </div>
    </div>
  );
}
