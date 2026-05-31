import { describe, it, expect } from 'vitest';
import { outfitItemById, outfitPieceFor, equippableOutfits } from '../src/lib/spriteIndex';
import type { SpriteIndex } from '../src/types/pieces';

const piece = (name: string, gender: 'male' | 'female') => ({
  guid: `${name}-${gender}`, name, atlas: 'a.png',
  bounds: { x: 0, y: 0, w: 1, h: 1 }, gender, flags: {},
});

const idx: SpriteIndex = {
  version: 1,
  byType: {
    // The visual piece is named "HandymanJumpsuit" / "PaladinDanse_T60" — NOT the
    // save id of every item that uses it.
    outfit: [
      piece('jumpsuit', 'male'), piece('jumpsuit', 'female'),
      piece('HandymanJumpsuit', 'male'), piece('HandymanJumpsuit', 'female'),
      piece('PaladinDanse_T60', 'male'),
    ],
    hair: [], body: [], outfitColoringMask: [], face: [], faceMask: [],
    helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
  },
  outfitItems: [
    { id: 'jumpsuit', name: 'Vault Suit', category: 3, pieceMale: 'jumpsuit', pieceFemale: 'jumpsuit' },
    { id: 'HandymanJumpsuit', name: 'Handyman Jumpsuit', category: 2, special: { A: 3 }, pieceMale: 'HandymanJumpsuit', pieceFemale: 'HandymanJumpsuit' },
    { id: 'HandymanJumpsuit_Expert', name: 'Handyman Jumpsuit', category: 2, special: { A: 7 }, pieceMale: 'HandymanJumpsuit', pieceFemale: 'HandymanJumpsuit' },
    { id: 'PaladinDansesPowerArmor', name: "Paladin Danse's Power Armor", category: 2, special: { S: 5 }, pieceMale: 'PaladinDanse_T60', pieceFemale: null },
    { id: 'Gen2SynthEnemy', name: 'Synth', category: 4, pieceMale: null, pieceFemale: null },
  ],
};

describe('outfit items', () => {
  it('looks up an item by its save id', () => {
    expect(outfitItemById(idx, 'HandymanJumpsuit_Expert')?.special).toEqual({ A: 7 });
    expect(outfitItemById(idx, 'nope')).toBeNull();
  });

  it('resolves a variant id to its shared visual piece', () => {
    // _Expert has no piece of its own; it must render the HandymanJumpsuit visual.
    expect(outfitPieceFor(idx, 'HandymanJumpsuit_Expert', 'male')?.name).toBe('HandymanJumpsuit');
  });

  it('resolves a unique id whose piece name differs from the id', () => {
    expect(outfitPieceFor(idx, 'PaladinDansesPowerArmor', 'male')?.name).toBe('PaladinDanse_T60');
  });

  it('falls back to the other gender when one is missing', () => {
    // PaladinDanse has no female visual — fall back to the male piece.
    expect(outfitPieceFor(idx, 'PaladinDansesPowerArmor', 'female')?.name).toBe('PaladinDanse_T60');
  });

  it('falls back to treating the id as a piece name (legacy/base outfits)', () => {
    expect(outfitPieceFor(idx, 'jumpsuit', 'female')?.name).toBe('jumpsuit');
  });

  it('lists only equippable (Premium + jumpsuit) outfits with a visual', () => {
    const ids = equippableOutfits(idx).map((o) => o.id).sort();
    expect(ids).toEqual(['HandymanJumpsuit', 'HandymanJumpsuit_Expert', 'PaladinDansesPowerArmor', 'jumpsuit']);
    // The CodeControlled enemy outfit with no visual is excluded.
    expect(ids).not.toContain('Gen2SynthEnemy');
  });

  it('filters by gender — no cross-gender outfits in the picker', () => {
    // PaladinDanse is male-only (pieceFemale null): shown to males, hidden from females.
    const male = equippableOutfits(idx, 'male').map((o) => o.id).sort();
    const female = equippableOutfits(idx, 'female').map((o) => o.id).sort();
    expect(male).toContain('PaladinDansesPowerArmor');
    expect(female).not.toContain('PaladinDansesPowerArmor');
    // Unisex outfits appear for both.
    expect(male).toContain('jumpsuit');
    expect(female).toContain('jumpsuit');
  });
});
