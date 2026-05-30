import type { MeshGeometry } from '../types/mesh';
import type { RenderLayer } from './dwellerLayers';

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;    // mesh UV (UV0; UV1 is identical in these meshes)
uniform vec4 u_view;    // (scaleX, scaleY, offsetX, offsetY) model->clip
uniform vec4 u_uvXform; // (scaleU, scaleV, offsetU, offsetV) per-layer texture transform
varying vec2 v_uv;
void main() {
  v_uv = a_uv * u_uvXform.xy + u_uvXform.zw;
  vec2 clip = a_pos * u_view.xy + u_view.zw;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec4 u_tint;
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  gl_FragColor = vec4(c.rgb * u_tint.rgb, c.a * u_tint.a);
}`;

export interface RendererLayerInput extends RenderLayer {
  image: HTMLImageElement;
}

export interface DwellerRenderer {
  draw(mesh: MeshGeometry, layers: RendererLayerInput[]): void;
  dispose(): void;
}

const ATLAS = 1024; // all dweller atlases are 1024x1024

type Rect = { u0: number; u1: number; v0: number; v1: number };

function spriteRect(b: { x: number; y: number; w: number; h: number }): Rect {
  return { u0: b.x / ATLAS, u1: (b.x + b.w) / ATLAS, v0: b.y / ATLAS, v1: (b.y + b.h) / ATLAS };
}

// Return the indices of triangles whose sampled-UV centroid lies inside `rect`.
// Confines head overlays (face/hair) to the head; body/outfit pass entirely.
function filterTriangles(
  mesh: MeshGeometry, sx: number, sy: number, ox: number, oy: number, rect: Rect,
): number[] {
  const eps = 1e-3;
  const out: number[] = [];
  const { indices, uvs } = mesh;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const cu = ((uvs[a][0] + uvs[b][0] + uvs[c][0]) / 3) * sx + ox;
    const cv = ((uvs[a][1] + uvs[b][1] + uvs[c][1]) / 3) * sy + oy;
    if (cu >= rect.u0 - eps && cu <= rect.u1 + eps && cv >= rect.v0 - eps && cv <= rect.v1 + eps) {
      out.push(a, b, c);
    }
  }
  return out;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

export function createDwellerRenderer(canvas: HTMLCanvasElement): DwellerRenderer {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true }) as WebGLRenderingContext;
  if (!gl) throw new Error('WebGL not available');

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  const aUv = gl.getAttribLocation(prog, 'a_uv');
  const uView = gl.getUniformLocation(prog, 'u_view');
  const uUvXform = gl.getUniformLocation(prog, 'u_uvXform');
  const uTint = gl.getUniformLocation(prog, 'u_tint');

  const posBuf = gl.createBuffer()!;
  const uvBuf = gl.createBuffer()!;
  const idxBuf = gl.createBuffer()!;
  const texCache = new WeakMap<HTMLImageElement, WebGLTexture>();

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function texFor(img: HTMLImageElement): WebGLTexture {
    let t = texCache.get(img);
    if (t) return t;
    t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    texCache.set(img, t);
    return t;
  }

  // Model space: fill viewport with margin. Calibrated in Task 14.
  const MODEL = { minX: -1.0, maxX: 1.0, minY: -0.1, maxY: 2.0 };
  function viewUniform(): [number, number, number, number] {
    const w = MODEL.maxX - MODEL.minX, h = MODEL.maxY - MODEL.minY;
    const cx = (MODEL.minX + MODEL.maxX) / 2, cy = (MODEL.minY + MODEL.maxY) / 2;
    const margin = 0.9;
    return [(2 / w) * margin, (2 / h) * margin, (-2 * cx / w) * margin, (-2 * cy / h) * margin];
  }

  return {
    draw(mesh, layers) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const positions = new Float32Array(mesh.positions.flat());
      const uvs = new Float32Array(mesh.uvs.flat());

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

      gl.uniform4fv(uView, viewUniform());

      for (const layer of layers) {
        const img = layer.image;
        const [sx, sy] = layer.uvScale;
        const [ox, oy] = layer.uvOffset;
        // Texture transform precomputed per Dressup.UpdateTexture (see dwellerLayers).
        gl.uniform4f(uUvXform, sx, sy, ox, oy);

        // The whole mesh shares one UV set, so every texture would otherwise smear
        // across the body. The game confines each texture with shader masks; we instead
        // draw only the triangles whose sampled UV lands inside this piece's sprite rect.
        // Body/outfit map uv0->their full sprite, so all triangles pass; face/hair are
        // confined to the head region. If triMask is set, use its transform for
        // triangle selection (e.g. head-skin layer masks by face-layer UV, not body UV).
        const m = layer.triMask;
        const rect = spriteRect(m ? m.bounds : layer.bounds);
        const [msx, msy] = m ? m.uvScale : [sx, sy];
        const [mox, moy] = m ? m.uvOffset : [ox, oy];
        const idx = filterTriangles(mesh, msx, msy, mox, moy, rect);
        if (idx.length === 0) continue;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

        const t = layer.tint ?? { r: 255, g: 255, b: 255, a: 1 };
        gl.uniform4f(uTint, t.r / 255, t.g / 255, t.b / 255, t.a);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texFor(img));
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      }
    },
    dispose() {
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(uvBuf);
      gl.deleteBuffer(idxBuf);
      gl.deleteProgram(prog);
    },
  };
}
