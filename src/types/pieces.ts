export type PieceType =
  | 'body'
  | 'outfit'
  | 'outfitColoringMask'
  | 'face'
  | 'faceMask'
  | 'hair'
  | 'helmet'
  | 'helmetMask'
  | 'largeHeadgear'
  | 'handPose'
  | 'glovePose';

export type Gender = 'male' | 'female';

export interface AtlasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PieceRef {
  guid: string;
  name: string;
  atlas: string;          // filename only, relative to /atlas/
  bounds: AtlasRect;      // pixel rect inside that atlas
  gender: Gender | 'any'; // 'any' for largeHeadgear and similar
  flags: {
    isBald?: boolean;
    type?: number;        // DwellerHair: 0=Normal, 1=Raider
    hasSkirt?: boolean;   // DwellerOutfit
    isUsedByDefault?: boolean;
    isExclusive?: boolean;   // DwellerHelmet: when true the hair is hidden
    // DwellerOutfit only: EOutfitCategory of the owning DwellerOutfitItem.
    // 0=None 1=Casual 2=Premium 3=Default 4=CodeControlled. Premium (2) are the
    // real, obtainable player items; the rest are enemy/scripted/default-only.
    // Absent when no DwellerOutfitItem references this visual outfit.
    outfitCategory?: number;
  };
  colors?: [number, number, number, number][]; // DwellerOutfit m_colors (rgba 0..1)
  // DwellerOutfit only: SPECIAL bonus from the owning DwellerOutfitItem's
  // m_specialStats. Only non-zero stats are present; absent when the outfit
  // grants no bonus. Keys are SPECIAL letters: S P E C I A L.
  special?: Partial<Record<'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L', number>>;
  // Outfit only: guids of associated pieces.
  helmetGuid?: string;
  largeHeadgearGuid?: string;
  coloringMaskGuid?: string;  // outfitColoringMask piece — determines which pixels get tinted
  glovePoseGuids?: string[];  // glovePose piece guids (gender-matching one selected at runtime)
  // Helmet / largeHeadgear only: associated mask piece guid.
  maskGuid?: string;
  // largeHeadgear only: placement vectors (Unity units) for the prebaked hat mesh.
  headgear?: {
    grabPoint?: [number, number];
    offset?: [number, number];
    scale?: [number, number];
  };
}

export interface SpriteIndex {
  version: 1;
  byType: Record<PieceType, PieceRef[]>;
}
