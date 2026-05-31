/** A single sprite cropped from a UI atlas PNG (top-left origin, Y downward). */
export interface IconRect {
  atlas: string; // PNG filename under /atlas/
  x: number;
  y: number;
  w: number;
  h: number;
  aw: number; // atlas width
  ah: number; // atlas height
}
