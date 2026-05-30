export interface MeshGeometry {
  positions: [number, number][]; // model-space XY (z dropped)
  uvs: [number, number][];       // uv0 per vertex, [0,1]
  uvs1: [number, number][];      // uv1 per vertex, [0,1] (used for face/hair layers)
  indices: number[];             // triangle list
  /** Per-submesh index counts. indices[0..indexCounts[0]-1] = submesh 0, etc. */
  indexCounts?: number[];
  /** Posed (skinned) positions, if pre-computed. Falls back to positions if absent. */
  posedPositions?: [number, number][];
}

export interface GenderMeshData {
  offsets: { hand: [number, number]; face: [number, number] };
  adult: MeshGeometry;
  child: MeshGeometry;
}

export interface DwellerMeshSet {
  version: 1;
  atlasSize: number; // 1024
  male: GenderMeshData;
  female: GenderMeshData;
  /** largeHeadgear mesh by piece guid: { male, female } */
  largeHeadgear?: Record<string, { male: MeshGeometry | null; female: MeshGeometry | null }>;
}
