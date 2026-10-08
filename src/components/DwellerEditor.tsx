import { useState, useEffect, useRef } from 'react';
import { useElementSize } from '../lib/useElementSize';
import { RoomBadge } from './RoomBadge';
import type { RoomEntry } from '../lib/rooms';
import { DwellerCanvas } from './DwellerCanvas';
import { ChildAvatar } from './editor/ChildAvatar';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { FaceTab } from './editor/FaceTab';
import { OutfitTab } from './editor/OutfitTab';
import { WeaponTab } from './editor/WeaponTab';
import { PetTab } from './editor/PetTab';
import { WeaponBadge } from './WeaponBadge';
import { PetBadge } from './PetBadge';
import { OutfitBadge } from './OutfitBadge';
import { DwellerStatsButton } from './DwellerStatsPanel';
import { StatsTab } from './editor/StatsTab';
import { AttributesTab } from './editor/AttributesTab';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { useSaveStore } from '../store/saveStore';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';
import { randomDwellerInput, applyCustomization, type DwellerCustomization } from '../lib/dwellerEdit';
import { LegendaryCatalogModal } from './LegendaryCatalogModal';
import { GearSwapDialog, requestGearChange } from './editor/GearSwapDialog';

export function DwellerEditor({
  dweller,
  name,
  room,
}: {
  dweller: RenderableDweller;
  name?: string;
  /** Assigned room; null means unassigned, undefined hides the room badge. */
  room?: RoomEntry | null;
}) {
  const [active, setActive] = useState('hair');
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addDweller = useSaveStore((s) => s.addDweller);
  const addLegendary = useSaveStore((s) => s.addLegendaryDweller);
  const [showLegendary, setShowLegendary] = useState(false);

  useEffect(() => { loadSpriteIndex().then(setIndex).catch((e) => setError(e.message)); }, []);

  const onChange = (patch: DwellerCustomization) =>
    requestGearChange((d) => applyCustomization(d, patch));

  const isChild = !!dweller.isChild;

  // Children get only SPECIAL and a reduced Attributes tab; everything that needs a
  // rendered model (hair/outfit/weapon/pet/face) is hidden.
  const tabs: EditorTab[] = isChild
    ? [
        { id: 'stats', label: 'SPECIAL' },
        { id: 'attributes', label: 'Attributes' },
      ]
    : [
        { id: 'hair', label: 'Hair' },
        { id: 'face', label: 'Face' },
        { id: 'outfit', label: 'Outfit' },
        { id: 'weapon', label: 'Weapon' },
        { id: 'pet', label: 'Pet' },
        { id: 'stats', label: 'SPECIAL' },
        { id: 'attributes', label: 'Attributes' },
      ];

  // Fall back to the first available tab when the current one isn't offered (e.g.
  // the default 'hair' for a child, or switching between a child and an adult).
  const activeTab = tabs.some((t) => t.id === active) ? active : tabs[0].id;

  // Portrait width follows the available height at the portrait's 170:221
  // ratio, but never takes more than 40% of the row.
  const rowRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const row = useElementSize(rowRef);
  const portrait = useElementSize(portraitRef);
  const portraitW = Math.floor(Math.min((portrait.height * 170) / 221, row.width * 0.4));

  // Portrait badges open their tab and scroll the equipped tile into view. Tabs
  // load their catalogs asynchronously, so wait for the tile to appear.
  const contentRef = useRef<HTMLDivElement>(null);
  const [jumpRequest, setJumpRequest] = useState(0);
  const jumpToSelected = (tab: string) => {
    setActive(tab);
    setJumpRequest((n) => n + 1);
  };

  useEffect(() => {
    const container = contentRef.current;
    if (!jumpRequest || !container) return;
    const tryScroll = () => {
      const el = container.querySelector<HTMLElement>('[data-selected]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.focus({ preventScroll: true });
      return true;
    };
    if (tryScroll()) return;
    const observer = new MutationObserver(() => { if (tryScroll()) cleanup(); });
    const timeout = window.setTimeout(() => cleanup(), 3000);
    const cleanup = () => { observer.disconnect(); window.clearTimeout(timeout); };
    observer.observe(container, { childList: true, subtree: true });
    return cleanup;
  }, [jumpRequest]);

  return (
    <div ref={rowRef} className="flex gap-4 xl:gap-6 h-full min-h-0">
      {/* Left: character name + portrait (fills available height, capped so the editor keeps room on narrow windows) */}
      <div className="flex-shrink-0 flex flex-col min-h-0 min-w-0" style={{ width: portraitW || undefined }}>
        {name && <div className="text-lg font-medium mb-2 truncate">{name}</div>}
        <div ref={portraitRef} className="flex-1 min-h-0 flex">
          <div className="h-full relative" style={portraitW ? { width: '100%' } : { aspectRatio: '170 / 221' }}>
            {isChild ? (
              <ChildAvatar />
            ) : (
              <>
                <DwellerCanvas dweller={dweller} fill />
                <div className="absolute bottom-1.5 inset-x-1.5 flex flex-wrap items-end gap-1.5 pointer-events-none [&>*]:pointer-events-auto">
                  <OutfitBadge dweller={dweller} onSelect={() => jumpToSelected('outfit')} />
                  <div className="ml-auto max-w-full min-w-0 flex flex-col items-end gap-1.5 [&>*]:pointer-events-auto">
                    <PetBadge onSelect={() => jumpToSelected('pet')} />
                    <WeaponBadge onSelect={() => jumpToSelected('weapon')} />
                  </div>
                </div>
              </>
            )}
            {room !== undefined && <RoomBadge room={room} />}
            <DwellerStatsButton index={index} />
          </div>
        </div>
      </div>

      {/* Right: Chrome-style tab strip (with close button) above scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* wrap-reverse: when space runs out the Add buttons wrap onto a row
            above the tabs, so the tabs stay attached to the border. In this
            mode items-start aligns to the bottom. */}
        <div className="flex flex-wrap-reverse items-start gap-x-2 border-b border-zinc-700">
          <div className="flex-[1_0_auto] max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <EditorTabBar tabs={tabs} active={activeTab} onSelect={setActive} />
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-2.5 pb-1.5 pt-1">
            <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
              Add a Dweller
            </span>
            <div className="flex items-center gap-1.5">
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
        <div ref={contentRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && activeTab === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'face' && <FaceTab index={index} dweller={dweller} onChange={onChange} />}
          {index && activeTab === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
          {activeTab === 'weapon' && <WeaponTab dweller={dweller} />}
          {activeTab === 'pet' && <PetTab dweller={dweller} />}
          {activeTab === 'stats' && <StatsTab dweller={dweller} />}
          {activeTab === 'attributes' && <AttributesTab dweller={dweller} onChange={onChange} index={index} />}
        </div>
      </div>
      {showLegendary && (
        <LegendaryCatalogModal
          onAdd={(entries) => { entries.forEach((e) => addLegendary(e)); setShowLegendary(false); }}
          onClose={() => setShowLegendary(false)}
        />
      )}
      <GearSwapDialog />
    </div>
  );
}
