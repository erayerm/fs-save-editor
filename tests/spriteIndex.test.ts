import { describe, it, expect } from 'vitest';
import {
  faceMaskCategory,
  faceMaskPieces,
  faceMaskPiecesByCategory,
  faceMaskValidForGender,
} from '../src/lib/spriteIndex';
import type { SpriteIndex } from '../src/types/pieces';

const piece = (name: string, gender: 'male' | 'female' | 'any') => ({
  guid: name + gender, name, atlas: 'a.png',
  bounds: { x: 0, y: 0, w: 1, h: 1 }, gender, flags: {},
});

const idx: SpriteIndex = {
  version: 1,
  byType: {
    hair: [], body: [], outfit: [], outfitColoringMask: [], face: [],
    faceMask: [
      piece('f_hair_11', 'male'),
      piece('Kellogg_beard', 'male'),
      piece('glasses', 'male'),
      piece('glasses', 'female'),
      piece('monocle', 'female'),
      piece('makeup', 'female'),
      piece('scars_01', 'male'),
      piece('wrinkles', 'male'),
      piece('wrinkles', 'female'),
      piece('ghoul_face', 'any'),
    ],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
} as unknown as SpriteIndex;

describe('faceMaskCategory', () => {
  it('classifies pieces by name pattern', () => {
    expect(faceMaskCategory('f_hair_11')).toBe('facialHair');
    expect(faceMaskCategory('Kellogg_beard')).toBe('facialHair');
    expect(faceMaskCategory('Mr House mustache')).toBe('facialHair');
    expect(faceMaskCategory('glasses2')).toBe('glasses');
    expect(faceMaskCategory('monocle')).toBe('glasses');
    expect(faceMaskCategory('Regs_sunglasses')).toBe('glasses');
    expect(faceMaskCategory('Doctor_spectacles')).toBe('glasses');
    expect(faceMaskCategory('eyepatch_Stephanie')).toBe('glasses');
    expect(faceMaskCategory('makeup_02')).toBe('makeup');
    expect(faceMaskCategory('face_paint')).toBe('makeup');
    expect(faceMaskCategory('scars_01')).toBe('scars');
    expect(faceMaskCategory('wrinkles')).toBe('other');
    expect(faceMaskCategory('ghoul_face')).toBe('other');
  });

  it('prefers facialHair when a name matches more than one pattern', () => {
    expect(faceMaskCategory('glasses2_withBeard')).toBe('facialHair');
  });
});

describe('faceMaskPieces', () => {
  it('returns pieces for the gender plus any-gender pieces', () => {
    const male = faceMaskPieces(idx, 'male').map((p) => p.name);
    expect(male).toContain('f_hair_11');
    expect(male).toContain('glasses');
    expect(male).toContain('ghoul_face');
    expect(male).not.toContain('monocle');
    const female = faceMaskPieces(idx, 'female').map((p) => p.name);
    expect(female).toContain('monocle');
    expect(female).toContain('ghoul_face');
    expect(female).not.toContain('f_hair_11');
  });
});

describe('faceMaskPiecesByCategory', () => {
  it('groups and orders categories, dropping empty ones', () => {
    // The female fixture has no facialHair and no scars pieces, so those groups
    // are dropped; wrinkles classifies as 'other'.
    const groups = faceMaskPiecesByCategory(idx, 'female');
    expect(groups.map((g) => g.category)).toEqual(['glasses', 'makeup', 'other']);
    const glasses = groups.find((g) => g.category === 'glasses')!;
    expect(glasses.pieces.map((p) => p.name)).toEqual(['glasses', 'monocle']);
  });
});

describe('faceMaskValidForGender', () => {
  it('is true when a piece exists for the gender or any', () => {
    expect(faceMaskValidForGender(idx, 'monocle', 'female')).toBe(true);
    expect(faceMaskValidForGender(idx, 'monocle', 'male')).toBe(false);
    expect(faceMaskValidForGender(idx, 'ghoul_face', 'male')).toBe(true);
    expect(faceMaskValidForGender(idx, 'f_hair_11', 'female')).toBe(false);
    expect(faceMaskValidForGender(idx, 'nope', 'male')).toBe(false);
  });
});
