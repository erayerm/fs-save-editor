export interface MeshGeometry {
  positions: [number, number][]; // model-space XY (z dropped)
  uvs: [number, number][];       // uv0 per vertex, [0,1]
  uvs1: [number, number][];      // uv1 per vertex, [0,1] (used for face/hair layers)
  indices: number[];             // triangle list
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
}
