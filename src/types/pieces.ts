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
  };
  colors?: [number, number, number, number][]; // DwellerOutfit m_colors (rgba 0..1)
  // outfit only: guid of associated helmet/largeHeadgear piece
  helmetGuid?: string;
  largeHeadgearGuid?: string;
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
