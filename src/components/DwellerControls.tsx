import { useEffect, useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import { loadSpriteIndex, piecesOfType } from '../lib/spriteIndex';
import { PiecePicker } from './PiecePicker';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';

export function DwellerControls({ dweller }: { dweller: RenderableDweller }) {
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const update = useSaveStore((s) => s.updateSelectedDweller);

  useEffect(() => {
    loadSpriteIndex().then(setIndex).catch(() => setIndex(null));
  }, []);

  if (!index) return null;
  const gender = dweller.gender === 2 ? 'male' : 'female';

  const hairs = piecesOfType(index, 'hair', { gender });
  const outfits = piecesOfType(index, 'outfit', { gender });

  return (
    <div className="space-y-2">
      <PiecePicker
        label="Hair"
        options={hairs.map((p) => ({ name: p.name }))}
        value={dweller.hairName}
        onChange={(name) => update({ hair: name })}
      />
      <PiecePicker
        label="Outfit"
        options={outfits.map((p) => ({ name: p.name }))}
        value={dweller.outfitName}
        onChange={(name) => update({ outfitId: name })}
      />
    </div>
  );
}
