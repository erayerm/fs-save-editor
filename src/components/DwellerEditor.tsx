import { useState, useEffect } from 'react';
import { DwellerCanvas } from './DwellerCanvas';
import { ChildAvatar } from './editor/ChildAvatar';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { FaceTab } from './editor/FaceTab';
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
import { LegendaryCatalogModal } from './LegendaryCatalogModal';

export function DwellerEditor({ dweller, name }: { dweller: RenderableDweller; name?: string }) {
  const [active, setActive] = useState('hair');
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useSaveStore((s) => s.updateSelectedDweller);
  const addDweller = useSaveStore((s) => s.addDweller);
  const addLegendary = useSaveStore((s) => s.addLegendaryDweller);
  const [showLegendary, setShowLegendary] = useState(false);

  useEffect(() => { loadSpriteIndex().then(setIndex).catch((e) => setError(e.message)); }, []);

  const onChange = (patch: DwellerCustomization) => update(patch);

  const isChild = !!dweller.isChild;

  // Children get only SPECIAL and a reduced Others tab; everything that needs a
  // rendered model (hair/outfit/weapon/pet/face) is hidden.
  const tabs: EditorTab[] = isChild
    ? [
        { id: 'stats', label: 'SPECIAL' },
        { id: 'others', label: 'Others' },
      ]
    : [
        { id: 'hair', label: 'Hair' },
        { id: 'face', label: 'Face' },
        { id: 'outfit', label: 'Outfit' },
        { id: 'weapon', label: 'Weapon' },
        { id: 'pet', label: 'Pet' },
        { id: 'stats', label: 'SPECIAL' },
        { id: 'others', label: 'Others' },
      ];

  // Fall back to the first available tab when the current one isn't offered (e.g.
  // the default 'hair' for a child, or switching between a child and an adult).
  const activeTab = tabs.some((t) => t.id === active) ? active : tabs[0].id;

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: character name + portrait (fills available height) */}
      <div className="flex-shrink-0 flex flex-col min-h-0">
        {name && <div className="text-lg font-medium mb-2 truncate">{name}</div>}
        <div className="flex-1 min-h-0 flex">
          <div className="h-full relative" style={{ aspectRatio: '170 / 221' }}>
            {isChild ? (
              <ChildAvatar />
            ) : (
              <>
                <DwellerCanvas dweller={dweller} fill />
                <OutfitBadge dweller={dweller} />
                <WeaponBadge />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Chrome-style tab strip (with close button) above scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex items-end gap-2 border-b border-zinc-700">
          <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <EditorTabBar tabs={tabs} active={activeTab} onSelect={setActive} />
          </div>
          <div className="shrink-0 -mb-px flex items-stretch rounded-t-lg border border-b-0 border-zinc-700 overflow-hidden">
            <span className="flex items-center px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-r border-zinc-700 whitespace-nowrap">
              Add a Dweller
            </span>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5">
              <button
                type="button"
                aria-label="Add a new custom dweller"
                title="Add a new custom dweller"
                onClick={() => addDweller(randomDwellerInput())}
                className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium bg-green-600 hover:bg-green-500 text-white whitespace-nowrap transition-colors"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span>
                Custom
              </button>
              <button
                type="button"
                aria-label="Add a legendary dweller"
                title="Add a legendary dweller"
                onClick={() => setShowLegendary(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium bg-green-600 hover:bg-green-500 text-white whitespace-nowrap transition-colors"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span>
                Legendary
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && activeTab === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'face' && <FaceTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
          {activeTab === 'weapon' && <WeaponTab dweller={dweller} />}
          {activeTab === 'pet' && <PetTab dweller={dweller} />}
          {activeTab === 'stats' && <StatsTab dweller={dweller} />}
          {activeTab === 'others' && <OthersTab dweller={dweller} onChange={onChange} index={index} />}
        </div>
      </div>
      {showLegendary && (
        <LegendaryCatalogModal
          onAdd={(entry) => { addLegendary(entry); setShowLegendary(false); }}
          onClose={() => setShowLegendary(false)}
        />
      )}
    </div>
  );
}
