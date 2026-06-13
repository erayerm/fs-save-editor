import { useSaveStore } from '../store/saveStore';
import { DwellerEditor } from './DwellerEditor';
import { isChildDweller, childDwellerIds, type RenderableDweller } from '../lib/dwellerRender';
import type { Dweller } from '../types/save';
import { decodeArgb } from '../lib/colors';
import { randomDwellerInput } from '../lib/dwellerEdit';

function toRenderable(d: Dweller, childIds: Set<number>): RenderableDweller {
  const raw = d as unknown as Record<string, any>;
  return {
    gender: d.gender,
    isChild: isChildDweller(raw as { experience?: { currentLevel?: number } }) || childIds.has(d.serializeId),
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
  const save = useSaveStore((s) => s.save);
  const addDweller = useSaveStore((s) => s.addDweller);
  if (!dweller) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-zinc-400 italic">No dwellers in this vault.</div>
        <button
          type="button"
          onClick={() => addDweller(randomDwellerInput())}
          className="flex items-center gap-1.5 px-3 h-8 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white"
        >
          <span aria-hidden="true">+</span>
          Add New Dweller
        </button>
      </div>
    );
  }
  const renderable = toRenderable(dweller, childDwellerIds(save));
  const name = `${dweller.name} ${dweller.lastName ?? ''}`.trim();
  return (
    <div className="h-full min-h-0">
      <DwellerEditor dweller={renderable} name={name} />
    </div>
  );
}
