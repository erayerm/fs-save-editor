import { useSaveStore } from '../store/saveStore';
import { DwellerCanvas } from './DwellerCanvas';
import type { RenderableDweller, Rgb } from '../lib/dwellerRender';
import type { Dweller } from '../types/save';

// Decode a 32-bit ARGB integer into 0..255 byte channels.
function decodeArgb(n: unknown): Rgb | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return {
    r: (n >>> 16) & 0xff,
    g: (n >>> 8) & 0xff,
    b: n & 0xff,
    a: (n >>> 24) & 0xff,
  };
}

// Adapter: map a Dweller from the save JSON to the shape DwellerCanvas needs.
function toRenderable(d: Dweller): RenderableDweller {
  const any = d as unknown as Record<string, any>;
  return {
    gender: d.gender,
    hairName: typeof any.hair === 'string' ? any.hair : undefined,
    outfitName:
      typeof any.equipedOutfit?.id === 'string' ? any.equipedOutfit.id : undefined,
    happinessValue:
      typeof any.happiness?.happinessValue === 'number'
        ? any.happiness.happinessValue
        : undefined,
    skinColor: decodeArgb(any.skinColor),
    hairColor: decodeArgb(any.hairColor),
    outfitColor: decodeArgb(any.outfitColor),
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
