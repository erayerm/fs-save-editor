import { useState, useEffect } from 'react';
import { DwellerCanvas } from './DwellerCanvas';
import { EditorTabBar, type EditorTab } from './editor/EditorTabBar';
import { HairTab } from './editor/HairTab';
import { OutfitTab } from './editor/OutfitTab';
import { loadSpriteIndex } from '../lib/spriteIndex';
import { useSaveStore } from '../store/saveStore';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { DwellerCustomization } from '../lib/dwellerEdit';

const TABS: EditorTab[] = [
  { id: 'hair', label: 'Hair' },
  { id: 'outfit', label: 'Outfit' },
  // Future: { id: 'stats', label: 'Stats' },
];

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

  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <DwellerCanvas dweller={dweller} size={360} />
      </div>
      <div className="flex gap-4 flex-1 min-w-0">
        <EditorTabBar tabs={TABS} active={active} onSelect={setActive} />
        <div className="flex-1 min-w-0">
          {error && <div className="text-red-400 text-sm">Could not load pieces: {error}</div>}
          {index && active === 'hair' && <HairTab index={index} dweller={dweller} onChange={onChange} />}
          {index && active === 'outfit' && <OutfitTab index={index} dweller={dweller} onChange={onChange} />}
        </div>
      </div>
    </div>
  );
}
