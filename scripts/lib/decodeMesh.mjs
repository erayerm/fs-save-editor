// scripts/lib/decodeMesh.mjs
// Decode Unity mesh binary fields exported by AssetRipper as hex strings.

/** uint16 LE index buffer -> number[]. count = index count (e.g. 102). */
export function decodeIndexBuffer(hex, count) {
  const buf = Buffer.from(hex, 'hex');
  const out = [];
  for (let i = 0; i < count; i++) out.push(buf.readUInt16LE(i * 2));
  return out;
}

/**
 * Decode interleaved-by-stream vertex data.
 * Layout (confirmed for MSH_Dweller): stream0 = pos float3 (12B),
 * stream1 = uv0 float2 @0 + uv1 float2 @8 (16B), stream2 = 4B (ignored).
 * Streams are concatenated: all stream0 verts, then all stream1, then stream2.
 * Returns { positions: [[x,y],...], uvs: [[u,v],...] } (z dropped; mesh is flat).
 */
export function decodeVertexStreams(hex, vertexCount) {
  const buf = Buffer.from(hex, 'hex');
  const STREAM0 = 12, STREAM1 = 16;
  const stream1Base = vertexCount * STREAM0;
  const positions = [];
  const uvs = [];
  for (let i = 0; i < vertexCount; i++) {
    const p = i * STREAM0;
    positions.push([buf.readFloatLE(p), buf.readFloatLE(p + 4)]);
    const u = stream1Base + i * STREAM1;
    uvs.push([buf.readFloatLE(u), buf.readFloatLE(u + 4)]);
  }
  return { positions, uvs };
}
