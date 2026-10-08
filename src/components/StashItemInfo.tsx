import { useEffect, useState } from 'react';
import { loadWeaponIndex } from '../lib/weaponIndex';
import { loadPetIndex } from '../lib/petIndex';
import { loadSpriteIndex, outfitItemById, outfitPieceFor, outfitValidForGender } from '../lib/spriteIndex';
import { specialBonusFor } from '../lib/outfitStats';
import { renderOutfitThumbnail } from '../lib/dwellerThumbnail';
import { decodeArgb } from '../lib/colors';
import { SpecialBadges } from './editor/SpecialBadges';
import { SpriteCrop } from './SpriteCrop';
import type { StashItem } from '../lib/stash';
import type { WeaponIndex } from '../types/weapons';
import type { PetIndex } from '../types/pets';
import type { SpriteIndex } from '../types/pieces';
import type { IconRect } from '../types/icons';

export interface ItemCatalogs {
  weapons: WeaponIndex | null;
  pets: PetIndex | null;
  sprites: SpriteIndex | null;
}

/** Weapon, pet and outfit catalogs, loaded once per mount (each is cached module-wide). */
export function useItemCatalogs(): ItemCatalogs {
  const [weapons, setWeapons] = useState<WeaponIndex | null>(null);
  const [pets, setPets] = useState<PetIndex | null>(null);
  const [sprites, setSprites] = useState<SpriteIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadWeaponIndex().then((i) => { if (alive) setWeapons(i); }).catch(() => {});
    loadPetIndex().then((i) => { if (alive) setPets(i); }).catch(() => {});
    loadSpriteIndex().then((i) => { if (alive) setSprites(i); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return { weapons, pets, sprites };
}

/** "MilitaryCircuitBoard" -> "Military Circuit Board". */
export const humanizeId = (id: string) =>
  id.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();

export interface ItemDisplay {
  name: string;
  icon: IconRect | null;
  detail: React.ReactNode;
}

export function describeStashItem(item: StashItem, cat: ItemCatalogs): ItemDisplay {
  if (item.type === 'Weapon') {
    const meta = cat.weapons?.weapons[item.id];
    return {
      name: meta?.name ?? humanizeId(item.id),
      icon: meta?.icon ?? null,
      detail: meta ? `${meta.damageMin}-${meta.damageMax} DMG` : 'Weapon',
    };
  }
  if (item.type === 'Outfit') {
    const meta = cat.sprites ? outfitItemById(cat.sprites, item.id) : null;
    return {
      name: meta?.name ?? humanizeId(item.id),
      icon: null,
      detail: <SpecialBadges bonus={meta?.special ?? specialBonusFor(item.id)} inline />,
    };
  }
  if (item.type === 'Pet') {
    const meta = cat.pets?.pets[item.id];
    const extra = (item.extraData ?? {}) as { uniqueName?: string; bonus?: string; bonusValue?: number };
    const breed = meta?.name ?? humanizeId(item.id);
    return {
      name: extra.uniqueName ? `${extra.uniqueName} (${breed})` : breed,
      icon: meta?.icon ?? null,
      detail: extra.bonus ? `${humanizeId(extra.bonus)} +${extra.bonusValue ?? 0}` : 'Pet',
    };
  }
  return { name: humanizeId(item.id), icon: null, detail: null };
}

/** Skin tone of a freshly created dweller, used for outfit previews. */
const PREVIEW_SKIN = decodeArgb(4294963175);

/**
 * Body + outfit preview (the same render as the Outfit tab), drawn on a male
 * body unless the outfit only has female art. Null when the outfit has no
 * renderable piece or the sprite index isn't loaded yet.
 */
function useOutfitPreview(id: string, sprites: SpriteIndex | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!sprites) return;
    const gender = outfitValidForGender(sprites, id, 'male') ? 2 : 1;
    if (!outfitPieceFor(sprites, id, gender === 2 ? 'male' : 'female')) return;
    let alive = true;
    renderOutfitThumbnail({ gender, outfitName: id, skinColor: PREVIEW_SKIN })
      .then((u) => { if (alive) setUrl(u); })
      .catch(() => {});
    return () => { alive = false; };
  }, [id, sprites]);
  return url;
}

function OutfitPreview({ id, name, sprites, size, fallback }: {
  id: string; name: string; sprites: SpriteIndex | null; size: number; fallback: React.ReactNode;
}) {
  const url = useOutfitPreview(id, sprites);
  if (!url) return <>{fallback}</>;
  return (
    <img src={url} alt={name}
      style={{ width: size, height: size, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
  );
}

/** Crate glyph + type name, for items without artwork (junk, unrecognized ids). */
function TypePlaceholder({ type, size }: { type: string; size: number }) {
  const glyph = Math.round(size * 0.45);
  return (
    <div className="flex flex-col items-center gap-1 text-zinc-600">
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
        <path d="m3 8 9 5 9-5M12 13v8" />
      </svg>
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{type}</span>
    </div>
  );
}

/** Icon for a stash item: weapon/pet sprite, rendered outfit preview, or a type placeholder. */
export function StashItemIcon({ item, display, catalogs, size }: {
  item: StashItem; display: ItemDisplay; catalogs: ItemCatalogs; size: number;
}) {
  const label = <TypePlaceholder type={item.type} size={size} />;
  if (display.icon) return <SpriteCrop rect={display.icon} size={size} title={display.name} />;
  if (item.type === 'Outfit') {
    return <OutfitPreview id={item.id} name={display.name} sprites={catalogs.sprites} size={size} fallback={label} />;
  }
  return label;
}
