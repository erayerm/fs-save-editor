// scripts/lib/decodeMesh.mjs
// Decode Unity mesh binary fields exported by AssetRipper as hex strings.

/** uint16 LE index buffer -> number[]. count = index count (e.g. 102). */
export function decodeIndexBuffer(hex, count) {
  const buf = Buffer.from(hex, 'hex');
  const maxCount = buf.length >> 1;
  if (count > maxCount) throw new RangeError(`decodeIndexBuffer: count ${count} exceeds buffer capacity ${maxCount}`);
  const out = [];
  for (let i = 0; i < count; i++) out.push(buf.readUInt16LE(i * 2));
  return out;
}

/**
 * Decode interleaved-by-stream vertex data.
 * Layout (confirmed for MSH_Dweller): stream0 = pos float3 (12B),
 * stream1 = uv0 float2 @0 + uv1 float2 @8 (16B), stream2 = boneIndex uint32 (4B).
 * Streams are concatenated: all stream0 verts, then all stream1, then stream2.
 * Returns { positions: [[x,y],...], uvs: [[u,v],...], boneIndices: number[] }.
 */
// Bytes per Unity VertexChannelFormat code (subset we encounter).
const FORMAT_BYTES = { 0: 4, 1: 2, 2: 1, 3: 1, 4: 2, 5: 2, 6: 1, 7: 1, 8: 2, 9: 2, 10: 4, 11: 4 };
// Unity vertex channel indices.
const CH_POSITION = 0, CH_UV0 = 4, CH_UV1 = 5;

/**
 * Channel-aware vertex decode. Unlike decodeVertexStreams (which hardcodes the
 * MSH_Dweller layout), this reads the mesh's own m_Channels descriptor to locate
 * each stream and channel. Needed for largeHeadgear meshes, whose stream1 holds
 * only UV0 (8B) rather than UV0+UV1 (16B).
 *
 * @param channels Array of { stream, offset, format, dimension } from m_Channels.
 * Returns { positions: [[x,y],...], uvs: [[u,v],...], uvs1: [[u,v],...] }.
 */
export function decodeVertexChannels(hex, vertexCount, channels) {
  const buf = Buffer.from(hex, 'hex');
  // Per-stream stride = max(offset + dimension*bytes) over that stream's channels.
  const strides = {};
  for (const c of channels) {
    if (!c.dimension) continue;
    const end = c.offset + c.dimension * (FORMAT_BYTES[c.format] ?? 4);
    strides[c.stream] = Math.max(strides[c.stream] ?? 0, end);
  }
  // Streams are concatenated in ascending order: all of stream0, then stream1, ...
  const streamBase = {};
  let base = 0;
  for (const s of Object.keys(strides).map(Number).sort((a, b) => a - b)) {
    streamBase[s] = base;
    base += strides[s] * vertexCount;
  }
  const readChannel = (chIndex, dim) => {
    const c = channels[chIndex];
    if (!c || !c.dimension) return null;
    const stride = strides[c.stream];
    const sbase = streamBase[c.stream];
    const out = [];
    for (let i = 0; i < vertexCount; i++) {
      const p = sbase + i * stride + c.offset;
      const v = [];
      for (let d = 0; d < dim; d++) v.push(buf.readFloatLE(p + d * 4));
      out.push(v);
    }
    return out;
  };
  const positions = readChannel(CH_POSITION, 2) ?? [];
  const uvs = readChannel(CH_UV0, 2) ?? positions.map(() => [0, 0]);
  const uvs1 = readChannel(CH_UV1, 2) ?? uvs;
  return { positions, uvs, uvs1 };
}

export function decodeVertexStreams(hex, vertexCount) {
  const buf = Buffer.from(hex, 'hex');
  const STREAM0 = 12, STREAM1 = 16, STREAM2 = 4;
  const stream1Base = vertexCount * STREAM0;
  const stream2Base = stream1Base + vertexCount * STREAM1;
  const expected = stream2Base + vertexCount * STREAM2;
  if (buf.length < expected) throw new RangeError(`decodeVertexStreams: buffer too short (${buf.length}B) for ${vertexCount} verts (need ${expected}B)`);
  const positions = [];
  const uvs = [];
  const uvs1 = [];
  const boneIndices = [];
  for (let i = 0; i < vertexCount; i++) {
    const p = i * STREAM0;
    positions.push([buf.readFloatLE(p), buf.readFloatLE(p + 4)]);
    const u = stream1Base + i * STREAM1;
    uvs.push([buf.readFloatLE(u), buf.readFloatLE(u + 4)]);        // UV0
    uvs1.push([buf.readFloatLE(u + 8), buf.readFloatLE(u + 12)]); // UV1
    boneIndices.push(buf.readUInt32LE(stream2Base + i * STREAM2));
  }
  return { positions, uvs, uvs1, boneIndices };
}
