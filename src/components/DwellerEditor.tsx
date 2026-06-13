import { useState, useEffect } from 'react';
import { DwellerCanvas } from './DwellerCanvas';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { FacialHairTab } from './editor/FacialHairTab';
import { OutfitTab } from './editor/OutfitTab';
import { WeaponTab } from './editor/WeaponTab';
import { PetTab } from './editor/PetTab';
import { WeaponBadge } from './WeaponBadge';
import { OutfitBadge } from './OutfitBadge';
import { StatsTab } from './editor/StatsTab';
import { OthersTab } from './editor/OthersTab';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { useSaveStore } from '../store/saveStore';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';
import { randomDwellerInput, type DwellerCustomization } from '../lib/dwellerEdit';

export function DwellerEditor({ dweller, name }: { dweller: RenderableDweller; name?: string }) {
  const [active, setActive] = useState('hair');
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useSaveStore((s) => s.updateSelectedDweller);
  const addDweller = useSaveStore((s) => s.addDweller);

  useEffect(() => { loadSpriteIndex().then(setIndex).catch((e) => setError(e.message)); }, []);

  const onChange = (patch: DwellerCustomization) => update(patch);

  if (dweller.isChild) {
    return (
      <div className="flex gap-6 h-full min-h-0">
        <div className="flex-shrink-0 flex flex-col min-h-0">
          {name && <div className="text-lg font-medium mb-2 truncate">{name}</div>}
          <div className="flex-1 min-h-0 flex">
            <div className="h-full" style={{ aspectRatio: '170 / 221' }}>
              <DwellerCanvas dweller={dweller} fill />
            </div>
          </div>
        </div>
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
    { id: 'pet', label: 'Pet' },
    { id: 'stats', label: 'SPECIAL' },
    { id: 'others', label: 'Others' },
  ];

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: character name + portrait (fills available height) */}
      <div className="flex-shrink-0 flex flex-col min-h-0">
        {name && <div className="text-lg font-medium mb-2 truncate">{name}</div>}
        <div className="flex-1 min-h-0 flex">
          <div className="h-full relative" style={{ aspectRatio: '170 / 221' }}>
            <DwellerCanvas dweller={dweller} fill />
            <OutfitBadge dweller={dweller} />
            <WeaponBadge />
          </div>
        </div>
      </div>

      {/* Right: Chrome-style tab strip (with close button) above scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <EditorTabBar tabs={tabs} active={active} onSelect={setActive} />
          </div>
          <button
            type="button"
            aria-label="Add a new dweller"
            title="Add a new dweller"
            onClick={() => addDweller(randomDwellerInput())}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            Add New Dweller
          </button>
        </div>
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && active === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && active === 'facialHair' && isMale && <FacialHairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && active === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
          {active === 'weapon' && <WeaponTab dweller={dweller} />}
          {active === 'pet' && <PetTab dweller={dweller} />}
          {active === 'stats' && <StatsTab dweller={dweller} />}
          {active === 'others' && <OthersTab dweller={dweller} onChange={onChange} />}
        </div>
      </div>
    </div>
  );
}
