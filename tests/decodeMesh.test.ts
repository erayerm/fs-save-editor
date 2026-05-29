import { describe, it, expect } from 'vitest';
import { decodeIndexBuffer, decodeVertexStreams } from '../scripts/lib/decodeMesh.mjs';

describe('decodeIndexBuffer', () => {
  it('reads uint16 LE indices', () => {
    // 0,1,2, 0,2,3
    const hex = '000001000200' + '000002000300';
    expect(decodeIndexBuffer(hex, 6)).toEqual([0, 1, 2, 0, 2, 3]);
  });
});

describe('decodeVertexStreams', () => {
  it('reads position float3 and uv0 float2 for N vertices', () => {
    function bufF(n: number) { const b = Buffer.alloc(4); b.writeFloatLE(n); return b.toString('hex'); }
    const stream0 = bufF(1) + bufF(2) + bufF(0);          // 12 bytes: pos (1,2,0)
    const stream1 = bufF(0.5) + bufF(0.25) + bufF(0) + bufF(0); // 16 bytes: uv0 (0.5,0.25) + uv1 (0,0)
    const stream2 = '00000000';                            // 4 bytes
    const hex = stream0 + stream1 + stream2;
    const { positions, uvs } = decodeVertexStreams(hex, 1);
    expect(positions).toEqual([[1, 2]]);
    expect(uvs[0][0]).toBeCloseTo(0.5, 5);
    expect(uvs[0][1]).toBeCloseTo(0.25, 5);
  });
});
