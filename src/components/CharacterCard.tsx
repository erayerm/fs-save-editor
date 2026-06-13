import { useSaveStore } from '../store/saveStore';
import { SpecialIcon } from './SpecialIcon';
import { useDwellerThumbnail } from '../lib/useDwellerThumbnail';
import { isChildDweller, childDwellerIds, type RenderableDweller } from '../lib/dwellerRender';
import { decodeArgb } from '../lib/colors';
import type { Dweller } from '../types/save';

const SPECIAL_LABELS = ['S', 'P', 'E', 'C', 'I', 'A', 'L'] as const;

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

// Match the outfit-picker thumbnail cell size (see OptionGrid defaults: 170×221).
export const AVATAR_SIZE = 170;
// Tight card width (just the avatar + its own padding).
export const CARD_INNER_W = AVATAR_SIZE + 8;
// Empty space between neighboring cards, applied as margin (not padding) so the
// card's own background/hover area stays tight to the avatar.
export const CARD_GAP = 20;
// Slot width consumed per card in the horizontal strip.
export const CARD_W = CARD_INNER_W + CARD_GAP;

interface Props {
  dweller: Dweller;
}

export function CharacterCard({ dweller }: Props) {
  const selectedId = useSaveStore((s) => s.selectedDwellerId);
  const selectDweller = useSaveStore((s) => s.selectDweller);
  const save = useSaveStore((s) => s.save);
  const isSelected = selectedId === dweller.serializeId;
  const renderable = toRenderable(dweller, childDwellerIds(save));
  const thumb = useDwellerThumbnail(renderable);

  const stats = dweller.stats?.stats;

  return (
    <div
      className={`flex flex-col items-center cursor-pointer select-none rounded px-1 py-1 transition-all ${
        isSelected ? 'ring-2 ring-green-400 bg-green-950/40' : 'hover:bg-zinc-800'
      }`}
      style={{ width: CARD_INNER_W }}
      onClick={() => selectDweller(dweller.serializeId)}
    >
      {/* SPECIAL row: 7-column grid spanning the full avatar width */}
      <div
        className="grid mb-1"
        style={{ width: AVATAR_SIZE, gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {SPECIAL_LABELS.map((label, i) => {
          const val = stats?.[i + 1]?.value ?? '–';
          return (
            <span key={label} className="flex flex-col items-center leading-none">
              <SpecialIcon letter={label} size={18} title={label} />
              <span className="text-zinc-300 font-mono" style={{ fontSize: 13 }}>{val}</span>
            </span>
          );
        })}
      </div>

      {/* Avatar */}
      <div
        className="bg-zinc-950 rounded border border-zinc-700 flex items-center justify-center overflow-hidden"
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 }}
      >
        {renderable.isChild ? (
          <span className="text-zinc-500 italic text-xs text-center px-2">Child</span>
        ) : thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="text-zinc-600 text-xs">…</span>
        )}
      </div>

      {/* Name */}
      <div className="text-zinc-100 text-center leading-tight mt-1" style={{ fontSize: 12 }}>
        {dweller.name} {dweller.lastName}
      </div>
    </div>
  );
}
