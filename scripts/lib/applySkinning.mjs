/**
 * Rigid-body skeletal skinning for Fallout Shelter dweller meshes.
 *
 * Each vertex is assigned to exactly ONE bone (stream2 = uint32 bone index,
 * implicit weight=1). To get the idle-pose position:
 *   posedXY = (worldPosed[boneIdx] × bindPose[boneIdx] × [x,y,z,1]).xy
 *
 * The Unity m_BindPose matrices are the world-to-bone (inverse bind) matrices.
 * The worldPosed matrix for each bone is computed by composing local transforms
 * up the hierarchy, where:
 *   - local translation = extracted from bind-pose matrices (no position curves)
 *   - local rotation    = time=0 quaternion from the idle AnimationClip
 */

// ── 4×4 matrix helpers (column-major compatible; Unity stores row-major eNN) ──

/** Multiply two 4×4 matrices (both stored row-major, [row][col] = m[r*4+c]). */
function mat4mul(A, B) {
  const C = new Float64Array(16);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k] * B[k * 4 + c];
  return C;
}

/** Transform a [x,y,z,1] point by a 4×4 row-major matrix. Returns [x,y]. */
function mat4mulPt(M, x, y, z) {
  const rx = M[0]*x + M[1]*y + M[2]*z + M[3];
  const ry = M[4]*x + M[5]*y + M[6]*z + M[7];
  // rz = M[8]*x+M[9]*y+M[10]*z+M[11]; (not needed for 2-D output)
  return [rx, ry];
}

/** Build a 4×4 row-major rotation matrix from a unit quaternion (x,y,z,w). */
function quatToMat4(x, y, z, w) {
  // Standard quaternion→rotation-matrix formula
  const M = new Float64Array(16);
  M[0]  = 1 - 2*(y*y + z*z);  M[1]  =     2*(x*y - z*w);  M[2]  =     2*(x*z + y*w);  M[3]  = 0;
  M[4]  =     2*(x*y + z*w);  M[5]  = 1 - 2*(x*x + z*z);  M[6]  =     2*(y*z - x*w);  M[7]  = 0;
  M[8]  =     2*(x*z - y*w);  M[9]  =     2*(y*z + x*w);  M[10] = 1 - 2*(x*x + y*y);  M[11] = 0;
  M[12] = 0;                  M[13] = 0;                  M[14] = 0;                  M[15] = 1;
  return M;
}

/** Build a translation-only 4×4 row-major matrix. */
function translateMat4(tx, ty, tz) {
  const M = new Float64Array([1,0,0,tx, 0,1,0,ty, 0,0,1,tz, 0,0,0,1]);
  return M;
}

// ── Unity m_BindPose matrix parsing ──

/**
 * Parse the m_BindPose YAML block into an array of 4×4 row-major Float64Arrays.
 * Each matrix entry looks like: e00:v e01:v ... e33:v (row-major in Unity).
 */
export function parseBindPose(assetText) {
  const matrices = [];
  const startIdx = assetText.indexOf('m_BindPose:');
  if (startIdx === -1) throw new Error('m_BindPose not found');
  // Find end of bind pose section (next top-level key at same or lesser indent).
  // Grab a generous slice; split on "- e00:" to isolate each matrix block.
  const bindSection = assetText.slice(startIdx + 'm_BindPose:'.length);
  // Split into blocks by "- e00:" marker. The first split chunk is empty/whitespace.
  const blocks = bindSection.split(/(?=\n\s*- e00:)/);
  for (const block of blocks) {
    const nums = [];
    const valRx = /e\d{2}:\s*([-\d.eE+]+)/g;
    let v;
    while ((v = valRx.exec(block)) !== null) {
      nums.push(parseFloat(v[1]));
      if (nums.length === 16) break; // stop after 16 values to avoid bleeding into next block
    }
    if (nums.length === 16) matrices.push(new Float64Array(nums));
  }
  return matrices;
}

// ── Unity idle AnimationClip parsing ──

/**
 * Parse time=0 rotation quaternions from a Unity .anim YAML file.
 * Returns Map<bonePath, {x,y,z,w}>.
 */
export function parseIdleRotations(animText) {
  const result = new Map();
  // Split into per-bone rotation curve blocks
  const curveBlocks = animText.split(/(?=  - curve:)/);
  for (const block of curveBlocks) {
    // Each block should have a path and at least one keyframe at time: 0
    const pathM = block.match(/\s+path:\s*(\S+)/);
    if (!pathM) continue;
    const path = pathM[1];
    // Find the first keyframe (time: 0)
    const kfM = block.match(/time:\s*0[\s\S]*?value:\s*\{x:\s*([\d.eE+\-]+),\s*y:\s*([\d.eE+\-]+),\s*z:\s*([\d.eE+\-]+),\s*w:\s*([\d.eE+\-]+)\}/);
    if (!kfM) continue;
    result.set(path, {
      x: parseFloat(kfM[1]), y: parseFloat(kfM[2]),
      z: parseFloat(kfM[3]), w: parseFloat(kfM[4]),
    });
  }
  return result;
}

// ── Bone hierarchy ──

/** Ordered bone paths as they appear in both the idle animation and m_BindPose. */
// Order matches the m_BindPose array in the mesh asset (verified by world-position anatomy
// and the rotation-curve order in the idle animation clips).
export const BONE_PATHS = [
  'Root',
  'Root/Chest',
  'Root/Chest/Head',
  'Root/Chest/L_Arm',
  'Root/Chest/L_Arm/L_Elbow',
  'Root/Chest/L_Arm/L_Elbow/L_Hand',
  'Root/Chest/R_Arm',
  'Root/Chest/R_Arm/R_Elbow',
  'Root/Chest/R_Arm/R_Elbow/R_Hand',
  'Root/R_Leg',
  'Root/R_Leg/R_Knee',
  'Root/R_Leg/R_Knee/R_Ankle',
  'Root/L_Leg',
  'Root/L_Leg/L_Knee',
  'Root/L_Leg/L_Knee/L_Ankle',
  'Root/L_Skirt',
  'Root/R_Skirt',
];

/** Parent index for each bone (-1 = root). Derived from BONE_PATHS. */
export function buildParentIndices() {
  return BONE_PATHS.map((path, i) => {
    if (i === 0) return -1;
    const parentPath = path.slice(0, path.lastIndexOf('/'));
    return BONE_PATHS.indexOf(parentPath);
  });
}

// ── Main skinning function ──

/**
 * Apply the idle-pose skeletal animation to vertex positions (rigid skinning).
 *
 * @param {number[][]} positions  - bind-pose XY positions [[x,y],...]
 * @param {number[]}   boneIndices - per-vertex bone index (one per vertex)
 * @param {Float64Array[]} bindPose - 17 inverse-bind-pose 4×4 matrices
 * @param {Map<string,{x,y,z,w}>} rotations - time=0 rotation per bone path
 * @returns {number[][]} posed XY positions
 */
export function applySkinning(positions, boneIndices, bindPose, rotations) {
  const parentIndices = buildParentIndices();
  const numBones = BONE_PATHS.length;

  // 1. Extract local bone translations from bind pose matrices.
  //    worldMatrix(i) = inv(bindPose[i])
  //    For each bone: localTranslation(i) = translation part of
  //      inv(worldMatrix(parent)) * worldMatrix(i) = bindPose[parent] * inv(bindPose[i])
  //    We'll compute this using the world positions: worldPos(i) = inv(bindPose[i]) * origin
  const worldPositions = bindPose.map(bp => {
    // inv(bp) * [0,0,0,1] = last column of inv(bp)
    // For a rigid matrix M, inv(M)[3][*] = translation row of inv(M)
    // Since bp is world-to-bone, bone-origin-in-world = inv(bp) * [0,0,0,1]
    // = -R^T * t where R is rotation block and t is translation column of bp
    // Simpler: just transform origin through inverse. Use row4 extraction.
    // M*inv(M)=I → columns of inv(M) can be found but let's just use 3D formula:
    // For M = [R|t; 0|1], inv(M) = [R^T | -R^T*t; 0|1].
    // So inv(M)*[0,0,0,1] = -R^T*t.
    // -R^T*t: R^T col j dotted with t = column j of R dotted with t.
    const t0 = bp[3], t1 = bp[7], t2 = bp[11];
    return [
      -(bp[0]*t0 + bp[4]*t1 + bp[8]*t2),   // R^T col 0 · t (column 0 of R)
      -(bp[1]*t0 + bp[5]*t1 + bp[9]*t2),   // R^T col 1 · t (column 1 of R)
      -(bp[2]*t0 + bp[6]*t1 + bp[10]*t2),  // R^T col 2 · t (column 2 of R)
    ];
  });

  // 2. Compute local translations: localPos(i) = worldPos(i) - worldPos(parent(i))
  //    (approximation assuming parent has no rotation drift; works for rigid hierarchy)
  // Actually use the exact: localPos = inv(worldRot(parent)) * (worldPos(i) - worldPos(parent))
  // For simplicity, store world positions and compute local by subtracting parent world pos.
  // This is correct only for pure translations, but since we're replacing rotation anyway,
  // we derive local translation from bind-pose world positions.

  // 3. Build posed world matrices bottom-up using idle rotation + local translation.
  const worldPosed = new Array(numBones).fill(null);

  for (let i = 0; i < numBones; i++) {
    const path = BONE_PATHS[i];
    const rot = rotations.get(path);
    if (!rot) throw new Error(`Missing idle rotation for bone: ${path}`);

    // Local rotation matrix from idle animation.
    const Rlocal = quatToMat4(rot.x, rot.y, rot.z, rot.w);

    // Local translation = world position of this bone in bind pose, expressed in parent space.
    // We compute it as: localPos = worldPos(i) - worldPos(parent)
    // then rotate by inverse of parent's bind-pose rotation to get parent-local coords.
    // For simplicity (and because this is 2D), we use bind-pose world-position differences.
    const wp = worldPositions[i];
    const parentIdx = parentIndices[i];
    let localTx, localTy, localTz;
    if (parentIdx === -1) {
      localTx = wp[0]; localTy = wp[1]; localTz = wp[2];
    } else {
      const pp = worldPositions[parentIdx];
      // Express (wp - pp) in parent's bind-pose local frame.
      // Parent bind pose R (rows = parent bone axes in world): bp[0..2], bp[4..6], bp[8..10]
      const pbp = bindPose[parentIdx];
      const dx = wp[0] - pp[0], dy = wp[1] - pp[1], dz = wp[2] - pp[2];
      // Rotate by parent's rotation matrix to get local coords:
      localTx = pbp[0]*dx + pbp[1]*dy + pbp[2]*dz;
      localTy = pbp[4]*dx + pbp[5]*dy + pbp[6]*dz;
      localTz = pbp[8]*dx + pbp[9]*dy + pbp[10]*dz;
    }

    // Local transform = T * R
    const Tlocal = translateMat4(localTx, localTy, localTz);
    const localM = mat4mul(Tlocal, Rlocal);

    if (parentIdx === -1) {
      worldPosed[i] = localM;
    } else {
      worldPosed[i] = mat4mul(worldPosed[parentIdx], localM);
    }
  }

  // 4. Apply rigid skinning: posedPos = worldPosed[b] * bindPose[b] * [x,y,z,1]
  return positions.map(([x, y], vi) => {
    const b = boneIndices[vi];
    const M = mat4mul(worldPosed[b], bindPose[b]);
    return mat4mulPt(M, x, y, 0);
  });
}
