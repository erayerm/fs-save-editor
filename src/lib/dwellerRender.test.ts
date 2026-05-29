import { describe, it, expect } from 'vitest';
import { buildDrawOps, faceNameForHappiness } from './dwellerRender';
import type { SpriteIndex } from '../types/pieces';

// gender 2 = male in the save encoding; this fixture index holds male pieces.
function mkIndex(): SpriteIndex {
  const body = {
    guid: 'bodyguid', name: 'base_body', atlas: 'a.png',
    bounds: { x: 0, y: 0, w: 512, h: 256 }, gender: 'male', flags: {},
  } as const;
  const hair = {
    guid: 'hairguid', name: '21', atlas: 'a.png',
    bounds: { x: 100, y: 100, w: 119, h: 115 }, gender: 'male', flags: {},
  } as const;
  const outfit = {
    guid: 'outfitguid', name: 'jumpsuit', atlas: 'a.png',
    bounds: { x: 200, y: 200, w: 140, h: 140 }, gender: 'male', flags: {},
  } as const;
  const face = {
    guid: 'faceguid', name: 'smile', atlas: 'a.png',
    bounds: { x: 50, y: 50, w: 64, h: 64 }, gender: 'male', flags: {},
  } as const;
  return {
    version: 1,
    byType: {
      body: [body], outfit: [outfit], outfitColoringMask: [], face: [face], faceMask: [],
      hair: [hair], helmet: [], helmetMask: [], largeHeadgear: [], handPose: [], glovePose: [],
    },
  };
}

describe('buildDrawOps', () => {
  it('emits body before hair in layer order, resolving hair by name', () => {
    const ops = buildDrawOps(
      { gender: 2, hairName: '21' },
      mkIndex(),
      { canvasW: 256, canvasH: 256 },
    );
    expect(ops.map((o) => o.src)).toEqual([
      { x: 0, y: 0, w: 512, h: 256 },     // body (default base_body)
      { x: 50, y: 50, w: 64, h: 64 },     // face (smile, happiness defaults to 100)
      { x: 100, y: 100, w: 119, h: 115 }, // hair "21"
    ]);
  });

  it('defaults to base_body when the dweller has no recognizable outfit', () => {
    const ops = buildDrawOps({ gender: 2 }, mkIndex(), { canvasW: 256, canvasH: 256 });
    // body + face (smile by default)
    expect(ops).toHaveLength(2);
    expect(ops[0].src).toEqual({ x: 0, y: 0, w: 512, h: 256 });
  });

  it('skips hair when piece flag isBald is true', () => {
    const idx = mkIndex();
    idx.byType.hair[0] = { ...idx.byType.hair[0], flags: { isBald: true } };
    const ops = buildDrawOps(
      { gender: 2, hairName: '21' },
      idx,
      { canvasW: 256, canvasH: 256 },
    );
    expect(ops).toHaveLength(2); // body + face (hair skipped due to isBald)
  });

  it('passes pre-decoded 0..255 skinColor bytes through as the tint', () => {
    const ops = buildDrawOps(
      { gender: 2, skinColor: { r: 255, g: 128, b: 0 } },
      mkIndex(),
      { canvasW: 256, canvasH: 256 },
    );
    expect(ops[0].tint).toEqual({ r: 255, g: 128, b: 0, a: 1 });
  });

  it('applies outfitColor as tint to outfit layer', () => {
    const idx = mkIndex();
    const ops = buildDrawOps(
      { gender: 2, outfitName: 'jumpsuit', outfitColor: { r: 100, g: 150, b: 200 } },
      idx,
      { canvasW: 256, canvasH: 256 },
    );
    const outfitOp = ops.find((o) => o.src.x === 200);
    expect(outfitOp?.tint).toEqual({ r: 100, g: 150, b: 200, a: 1 });
  });

  it('emits face layer between outfit and hair', () => {
    const ops = buildDrawOps(
      { gender: 2, hairName: '21', happinessValue: 80 }, // >75 = smile
      mkIndex(),
      { canvasW: 256, canvasH: 256 },
    );
    // layer order: body, face, hair (no outfit in this case)
    const atlases = ops.map((o) => o.src);
    const faceIdx = atlases.findIndex((s) => s.x === 50 && s.y === 50);
    const hairIdx = atlases.findIndex((s) => s.x === 100 && s.y === 100);
    expect(faceIdx).toBeGreaterThan(-1);  // face was emitted
    expect(faceIdx).toBeLessThan(hairIdx); // face comes before hair
  });

  it('faceNameForHappiness returns correct lowercase names', () => {
    expect(faceNameForHappiness(0)).toBe('sad');
    expect(faceNameForHappiness(49)).toBe('sad');
    expect(faceNameForHappiness(50)).toBe('neutral');
    expect(faceNameForHappiness(75)).toBe('neutral');
    expect(faceNameForHappiness(76)).toBe('smile');
    expect(faceNameForHappiness(100)).toBe('smile');
    expect(faceNameForHappiness(undefined)).toBe('smile');
  });
});

function mkPiece(name: string, bounds: import('../types/pieces').PieceRef['bounds'], flags: import('../types/pieces').PieceRef['flags'] = {}): import('../types/pieces').PieceRef {
  return { guid: name, name, atlas: 'atlas0.png', bounds, gender: 'female', flags };
}
function mkIndex2(): import('../types/pieces').SpriteIndex {
  return {
    version: 1,
    byType: {
      body: [mkPiece('base_body', { x: 144, y: 0, w: 512, h: 256 })],
      outfit: [mkPiece('jumpsuit', { x: 512, y: 256, w: 512, h: 256 })],
      face: [mkPiece('smile', { x: 0, y: 512, w: 136, h: 128 })],
      hair: [mkPiece('21', { x: 840, y: 264, w: 140, h: 132 })],
      outfitColoringMask: [], faceMask: [], helmet: [], helmetMask: [],
      largeHeadgear: [], handPose: [], glovePose: [],
    } as import('../types/pieces').SpriteIndex['byType'],
  };
}

const CFG = { canvasW: 320, canvasH: 320 };
const DW: import('./dwellerRender').RenderableDweller = {
  gender: 1, hairName: '21', outfitName: 'jumpsuit', happinessValue: 100,
};

describe('buildDrawOps positioning', () => {
  it('body and outfit share an identical dst rect (both 512x256)', () => {
    const ops = buildDrawOps(DW, mkIndex2(), CFG);
    expect(ops[0].dst).toEqual(ops[1].dst);
  });

  it('preserves each piece aspect ratio (uniform scale, no stretch)', () => {
    const ops = buildDrawOps(DW, mkIndex2(), CFG);
    for (const op of ops) {
      const srcRatio = op.src.w / op.src.h;
      const dstRatio = op.dst.w / op.dst.h;
      expect(dstRatio).toBeCloseTo(srcRatio, 5);
    }
  });

  it('head pieces (face, hair) render smaller than the body', () => {
    const ops = buildDrawOps(DW, mkIndex2(), CFG);
    const bodyW = ops[0].dst.w;
    const faceW = ops[2].dst.w;
    const hairW = ops[3].dst.w;
    expect(faceW).toBeLessThan(bodyW);
    expect(hairW).toBeLessThan(bodyW);
  });

  it('head pieces are horizontally centered on the canvas', () => {
    const ops = buildDrawOps(DW, mkIndex2(), CFG);
    const center = (op: { dst: { x: number; w: number } }) => op.dst.x + op.dst.w / 2;
    expect(center(ops[2])).toBeCloseTo(CFG.canvasW / 2, 1);
    expect(center(ops[3])).toBeCloseTo(CFG.canvasW / 2, 1);
  });

  it('every dst stays within the canvas bounds', () => {
    const ops = buildDrawOps(DW, mkIndex2(), CFG);
    for (const op of ops) {
      expect(op.dst.x).toBeGreaterThanOrEqual(0);
      expect(op.dst.y).toBeGreaterThanOrEqual(0);
      expect(op.dst.x + op.dst.w).toBeLessThanOrEqual(CFG.canvasW + 0.01);
      expect(op.dst.y + op.dst.h).toBeLessThanOrEqual(CFG.canvasH + 0.01);
    }
  });
});
