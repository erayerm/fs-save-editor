import { describe, it, expect } from 'vitest';
import { buildLayers, type RenderLayer, nearestOutfitColor } from '../src/lib/dwellerLayers';
import type { SpriteIndex } from '../src/types/pieces';
import type { MeshGeometry } from '../src/types/mesh';

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

describe('buildLayers largeHeadgear', () => {
  const mitrePiece = piece({
    guid: 'mitre-guid',
    name: 'mitre',
    atlas: 'outfit_atlas_34.png',
    bounds: { x: 0, y: 0, w: 115, h: 111 },
    gender: 'any',
    headgear: { grabPoint: [0.42, 0.009], offset: [0, 0], scale: [0.11, 0.11] },
  });
  const outfitWithMitre = piece({
    name: 'bishop_outfit',
    gender: 'male',
    largeHeadgearGuid: 'mitre-guid',
  });
  const idxWithMitre: SpriteIndex = {
    version: 1,
    byType: {
      ...idx.byType,
      outfit: [outfitWithMitre],
      largeHeadgear: [mitrePiece],
    },
  };

  const fakeMesh: MeshGeometry = {
    positions: Array(72).fill([0, 0]) as [number, number][],
    uvs: Array(72).fill([0, 0]) as [number, number][],
    uvs1: Array(72).fill([0, 0]) as [number, number][],
    indices: Array(108).fill(0),
    indexCounts: [102, 6],
  };

  const meshes = {
    largeHeadgear: {
      'mitre-guid': { male: fakeMesh, female: null },
    },
  };

  it('emits a headgear layer with correct slot, meshOverride, and uvScale', () => {
    const layers = buildLayers(
      { gender: 2, outfitName: 'bishop_outfit', happinessValue: 60 },
      idxWithMitre,
      undefined,
      meshes,
    );
    const hgLayer = layers.find((l: RenderLayer) => l.slot === 'headgear');
    expect(hgLayer).toBeDefined();
    expect(hgLayer!.meshOverride).toBe(fakeMesh);
    // uvScale should be the headgear's own bounds / ATLAS (115/1024, 111/1024)
    expect(hgLayer!.uvScale[0]).toBeCloseTo(115 / 1024, 6);
    expect(hgLayer!.uvScale[1]).toBeCloseTo(111 / 1024, 6);
    // meshSubmesh should point to the hat quad (submesh 1: start=102, count=6)
    expect(hgLayer!.meshSubmesh).toEqual({ start: 102, count: 6 });
  });

  it('does not emit headgear layer when meshes arg is omitted', () => {
    const layers = buildLayers(
      { gender: 2, outfitName: 'bishop_outfit', happinessValue: 60 },
      idxWithMitre,
    );
    expect(layers.find((l: RenderLayer) => l.slot === 'headgear')).toBeUndefined();
  });
});

describe('nearestOutfitColor', () => {
  it('returns desired unchanged when outfit has no colors', () => {
    expect(nearestOutfitColor({ r: 10, g: 20, b: 30 }, undefined))
      .toEqual({ r: 10, g: 20, b: 30 });
  });
  it('snaps any desired color to the single allowed color (SportsfanSpecial-style)', () => {
    const red: [number, number, number, number] = [1, 0, 0, 1];
    expect(nearestOutfitColor({ r: 255, g: 255, b: 255 }, [red]))
      .toEqual({ r: 255, g: 0, b: 0 });
  });
  it('picks the nearest of several allowed colors', () => {
    const red: [number, number, number, number] = [1, 0, 0, 1];
    const blue: [number, number, number, number] = [0, 0, 1, 1];
    expect(nearestOutfitColor({ r: 10, g: 10, b: 200 }, [red, blue]))
      .toEqual({ r: 0, g: 0, b: 255 });
  });
});
