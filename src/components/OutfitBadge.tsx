import { useEffect, useState } from 'react';
import { SpecialBadges } from './editor/SpecialBadges';
import { renderOutfitThumbnail } from '../lib/dwellerThumbnail';
import { loadSpriteIndex, outfitItemById } from '../lib/spriteIndex';
import { specialBonusFor } from '../lib/outfitStats';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';

/**
 * Small overlay shown in the bottom-left corner of the dweller portrait,
 * displaying the equipped outfit's name and SPECIAL buffs (text left) plus a
 * rendered thumbnail of the outfit (image right).
 */
export function OutfitBadge({ dweller, onSelect }: { dweller: RenderableDweller; onSelect?: () => void }) {
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadSpriteIndex().then((idx) => { if (alive) setIndex(idx); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    renderOutfitThumbnail(dweller).then((u) => { if (alive) setThumb(u); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dweller.outfitName, dweller.gender, dweller.skinColor, dweller.outfitColor]);

  if (!dweller.outfitName) return null;

  const item = index ? outfitItemById(index, dweller.outfitName) : null;
  const bonus = item?.special ?? specialBonusFor(dweller.outfitName);
  const label = item?.name ?? dweller.outfitName;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Outfit: ${label}. Open outfit tab`}
      className="max-w-full min-w-0 flex items-center gap-2 rounded bg-zinc-900/85 border border-zinc-700 px-2 py-1 leading-tight shadow-lg transition-colors hover:border-green-500 hover:bg-zinc-800/90 focus-visible:outline-none focus-visible:border-green-500"
    >
      <div className="text-left min-w-0">
        <div className="text-green-400 font-medium truncate" style={{ fontSize: 12 }} title={label}>{label}</div>
        <div className="mt-0.5">
          <SpecialBadges bonus={bonus} inline />
        </div>
      </div>
      {thumb && (
        <img
          src={thumb}
          alt={label}
          className="shrink-0"
          style={{ width: 40, height: 40, objectFit: 'contain' }}
        />
      )}
    </button>
  );
}
