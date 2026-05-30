import { useSaveStore } from '../store/saveStore';
import { DwellerCanvas } from './DwellerCanvas';
import { isChildDweller, type RenderableDweller } from '../lib/dwellerRender';
import { decodeArgb } from '../lib/colors';
import type { Dweller } from '../types/save';

const SPECIAL_LABELS = ['S', 'P', 'E', 'C', 'I', 'A', 'L'] as const;

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

export const CARD_W = 120;

interface Props {
  dweller: Dweller;
}

export function CharacterCard({ dweller }: Props) {
  const selectedId = useSaveStore((s) => s.selectedDwellerId);
  const selectDweller = useSaveStore((s) => s.selectDweller);
  const isSelected = selectedId === dweller.serializeId;
  const renderable = toRenderable(dweller);

  const stats = dweller.stats?.stats;

  return (
    <div
      className={`flex flex-col items-center cursor-pointer select-none rounded px-1 py-1 transition-all ${
        isSelected ? 'ring-2 ring-emerald-400 bg-zinc-800' : 'hover:bg-zinc-800'
      }`}
      style={{ width: CARD_W }}
      onClick={() => selectDweller(dweller.serializeId)}
    >
      {/* SPECIAL row */}
      <div className="flex gap-0.5 flex-wrap justify-center mb-0.5">
        {SPECIAL_LABELS.map((label, i) => {
          const val = stats?.[i + 1]?.value ?? '–';
          return (
            <span key={label} className="text-zinc-300 font-mono" style={{ fontSize: 9 }}>
              <span className="text-zinc-500">{label}</span>{val}
            </span>
          );
        })}
      </div>

      {/* Avatar */}
      <div style={{ width: 80, height: 80, overflow: 'hidden', flexShrink: 0 }}>
        <DwellerCanvas dweller={renderable} size={80} />
      </div>

      {/* Name */}
      <div className="text-zinc-100 text-center leading-tight mt-0.5" style={{ fontSize: 10 }}>
        {dweller.name} {dweller.lastName}
      </div>

      {/* Room */}
      {dweller.savedRoom != null && (
        <div className="text-zinc-500 text-center" style={{ fontSize: 9 }}>
          Room {dweller.savedRoom}
        </div>
      )}
    </div>
  );
}
