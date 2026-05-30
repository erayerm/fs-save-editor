// Colors come pre-decoded from ARGB ints into 0..255 byte channels (see adapter in Task 7).
export interface Rgb {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a?: number; // 0..255, optional
}

// Minimal dweller shape this module reads. References are by NAME, not GUID.
export interface RenderableDweller {
  gender: number;            // 1 = female, 2 = male
  isChild?: boolean;         // experience.currentLevel === 0 — not customizable
  hairName?: string;         // d.hair  (e.g. "21", "hair_CooperHoward")
  facialHair?: string;       // d.faceMask  (male beard/mustache piece name, e.g. "f_hair_11")
  outfitName?: string;       // d.equipedOutfit.id  (e.g. "jumpsuit")
  happinessValue?: number;   // 0..100 — face is derived from this
  skinColor?: Rgb;
  hairColor?: Rgb;
  outfitColor?: Rgb;
}

// Children (experience.currentLevel === 0) are not customizable in-game; we leave
// their appearance untouched and disable editing for them.
export function isChildDweller(raw: { experience?: { currentLevel?: number } }): boolean {
  return raw.experience?.currentLevel === 0;
}

// Face is not stored; derive it from happiness (from DwellerFace.cs thresholds).
export function faceNameForHappiness(happiness: number | undefined): string {
  const h = happiness ?? 100;
  if (h < 50) return 'sad';
  if (h <= 75) return 'neutral';
  return 'smile';
}
