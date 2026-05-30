import { describe, it, expect } from 'vitest';
import { buildLayers, type RenderLayer } from '../src/lib/dwellerLayers';
import type { SpriteIndex } from '../src/types/pieces';

function piece(over: Partial<any> = {}) {
  return {
    guid: 'g' + Math.random(), name: 'n', atlas: 'a.png',
    bounds: { x: 0, y: 0, w: 100, h: 100 }, gender: 'male',
    flags: {}, ...over,
  };
}

const idx: SpriteIndex = {
  version: 1,
  byType: {
    body: [piece({ name: 'base_body', gender: 'male' })],
    outfit: [piece({ name: 'jumpsuit', gender: 'male' })],
    face: [piece({ name: 'neutral', gender: 'male' })],
    hair: [piece({ name: '16', gender: 'male' })],
    outfitColoringMask: [], faceMask: [], helmet: [], helmetMask: [],
    largeHeadgear: [], handPose: [], glovePose: [],
  },
};

describe('buildLayers', () => {
  it('orders body, outfit, face, hair back-to-front', () => {
    const layers = buildLayers(
      { gender: 2, outfitName: 'jumpsuit', hairName: '16', happinessValue: 60 },
      idx,
    );
    expect(layers.map((l: RenderLayer) => l.slot)).toEqual(["body", "outfit", "body", "face", "hair"]);
  });

  it('applies skin tint to body and hair tint to hair', () => {
    const layers = buildLayers(
      { gender: 2, hairName: '16', skinColor: { r: 200, g: 150, b: 100 }, hairColor: { r: 10, g: 20, b: 30 } },
      idx,
    );
    const body = layers.find((l) => l.slot === 'body')!;
    const hair = layers.find((l) => l.slot === 'hair')!;
    expect(body.tint).toEqual({ r: 200, g: 150, b: 100, a: 1 });
    expect(hair.tint).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it('applies face uvOffset from gender offsets', () => {
    const layers = buildLayers(
      { gender: 2, happinessValue: 60 },
      idx,
      { hand: [0, -0.126], face: [-0.004, -0.005] },
    );
    const face = layers.find((l) => l.slot === 'face')!;
    expect(face.uvOffset).toEqual([-0.004, -0.005]);
  });

  it('omits hair when bald', () => {
    const baldIdx = { ...idx, byType: { ...idx.byType, hair: [piece({ name: 'bald', gender: 'male', flags: { isBald: true } })] } };
    const layers = buildLayers({ gender: 2, hairName: 'bald' }, baldIdx);
    expect(layers.find((l) => l.slot === 'hair')).toBeUndefined();
  });
});
