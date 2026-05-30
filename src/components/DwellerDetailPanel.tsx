import { useSaveStore } from '../store/saveStore';
import { DwellerEditor } from './DwellerEditor';
import { isChildDweller, type RenderableDweller } from '../lib/dwellerRender';
import type { Dweller } from '../types/save';
import { decodeArgb } from '../lib/colors';

function toRenderable(d: Dweller): RenderableDweller {
  const raw = d as unknown as Record<string, any>;
  return {
    gender: d.gender,
    isChild: isChildDweller(raw as { experience?: { currentLevel?: number } }),
    hairName: typeof raw.hair === 'string' ? raw.hair : undefined,
    facialHair: typeof raw.faceMask === 'string' ? raw.faceMask : undefined,
    outfitName: typeof raw.equipedOutfit?.id === 'string' ? raw.equipedOutfit.id : undefined,
    happinessValue: typeof raw.happiness?.happinessValue === 'number' ? raw.happiness.happinessValue : undefined,
    skinColor: decodeArgb(raw.skinColor),
    hairColor: decodeArgb(raw.hairColor),
    outfitColor: decodeArgb(raw.outfitColor),
  };
}

export function DwellerDetailPanel() {
  const dweller = useSaveStore((s) => s.getSelectedDweller());
  if (!dweller) {
    return <div className="text-zinc-400 italic">Select a dweller to preview.</div>;
  }
  const renderable = toRenderable(dweller);
  return (
    <div className="space-y-3">
      <div className="text-lg font-medium">{dweller.name} {dweller.lastName}</div>
      <DwellerEditor dweller={renderable} />
    </div>
  );
}
