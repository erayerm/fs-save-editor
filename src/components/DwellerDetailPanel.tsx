import { useSaveStore } from '../store/saveStore';
import { DwellerCanvas } from './DwellerCanvas';
import type { RenderableDweller } from '../lib/dwellerRender';
import type { Dweller } from '../types/save';
import { decodeArgb } from '../lib/colors';

// Adapter: map a Dweller from the save JSON to the shape DwellerCanvas needs.
function toRenderable(d: Dweller): RenderableDweller {
  const raw = d as unknown as Record<string, any>;
  return {
    gender: d.gender,
    hairName: typeof raw.hair === 'string' ? raw.hair : undefined,
    outfitName:
      typeof raw.equipedOutfit?.id === 'string' ? raw.equipedOutfit.id : undefined,
    happinessValue:
      typeof raw.happiness?.happinessValue === 'number'
        ? raw.happiness.happinessValue
        : undefined,
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
      <DwellerCanvas dweller={renderable} />
      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer">Raw piece refs</summary>
        <pre className="overflow-auto max-h-48 bg-zinc-950 p-2 rounded">
{JSON.stringify(renderable, null, 2)}
        </pre>
      </details>
    </div>
  );
}
