import { useEffect, useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import { loadSpriteIndex, piecesOfType } from '../lib/spriteIndex';
import { PiecePicker } from './PiecePicker';
import { ColorPicker } from './ColorPicker';
import type { SpriteIndex } from '../types/pieces';
import type { RenderableDweller } from '../lib/dwellerRender';

export function DwellerControls({ dweller }: { dweller: RenderableDweller }) {
  const [index, setIndex] = useState<SpriteIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const update = useSaveStore((s) => s.updateSelectedDweller);

  useEffect(() => {
    loadSpriteIndex().then(setIndex).catch(() => setLoadError(true));
  }, []);

  if (loadError) return <p className="text-xs text-red-400">Could not load pieces.</p>;
  if (!index) return null;
  const gender = dweller.gender === 2 ? 'male' : 'female';

  const hairs = piecesOfType(index, 'hair', { gender });
  const outfits = piecesOfType(index, 'outfit', { gender });

  const hairOptions: { name: string; label?: string }[] = hairs.map((p) => ({ name: p.name }));
  if (dweller.hairName && !hairs.some((p) => p.name === dweller.hairName)) {
    hairOptions.unshift({ name: dweller.hairName, label: `${dweller.hairName} (unknown)` });
  }

  const outfitOptions: { name: string; label?: string }[] = outfits.map((p) => ({ name: p.name }));
  if (dweller.outfitName && !outfits.some((p) => p.name === dweller.outfitName)) {
    outfitOptions.unshift({ name: dweller.outfitName, label: `${dweller.outfitName} (unknown)` });
  }

  return (
    <div className="space-y-2">
      <PiecePicker
        label="Hair"
        options={hairOptions}
        value={dweller.hairName}
        onChange={(name) => update({ hair: name })}
      />
      <PiecePicker
        label="Outfit"
        options={outfitOptions}
        value={dweller.outfitName}
        onChange={(name) => update({ outfitId: name })}
      />
      <ColorPicker label="Skin" value={dweller.skinColor}
        onChange={(c) => update({ skinColor: c })} />
      <ColorPicker label="Hair" value={dweller.hairColor}
        onChange={(c) => update({ hairColor: c })} />
      <ColorPicker label="Outfit" value={dweller.outfitColor}
        onChange={(c) => update({ outfitColor: c })} />
    </div>
  );
}
