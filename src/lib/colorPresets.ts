import type { Rgb } from './dwellerRender';

// Game-accurate hair & skin color palettes.
//
// Source: Fallout Shelter game export — DwellerPieceList catalog assets
//   TEMPORARY-game-files/export-3/ExportedProject/Assets/MonoBehaviour/list_0.asset
//   TEMPORARY-game-files/export-3/ExportedProject/Assets/MonoBehaviour/list_1.asset
// (the two per-gender DwellerPieceList catalogs referenced by
//  DwellerCustomization.cs via catalogForGender.m_hairColors / m_skinColors).
//
// Colors are stored there as Unity Color floats (r,g,b in 0..1). They were
// converted to 0..255 integers via Math.round(x * 255). The lists below are the
// union of both gender catalogs' natural in-game palettes (m_hairColors /
// m_skinColors), deduplicated. The full-saturation m_hairColorsForCustomization
// novelty colors (pure red/green/blue/etc.) are intentionally excluded.

export const HAIR_PRESETS: Rgb[] = [
  { r: 206, g: 177, b: 56 },
  { r: 165, g: 76, b: 44 },
  { r: 90, g: 49, b: 34 },
  { r: 103, g: 74, b: 36 },
  { r: 47, g: 40, b: 32 },
  { r: 226, g: 207, b: 198 },
  { r: 203, g: 162, b: 111 },
  { r: 86, g: 88, b: 98 },
  { r: 158, g: 87, b: 91 },
  { r: 255, g: 255, b: 83 },
  { r: 255, g: 172, b: 83 },
  { r: 212, g: 84, b: 55 },
  { r: 113, g: 7, b: 41 },
  { r: 118, g: 65, b: 46 },
  { r: 105, g: 85, b: 59 },
  { r: 255, g: 255, b: 255 },
  { r: 230, g: 135, b: 49 },
  { r: 232, g: 180, b: 7 },
  { r: 83, g: 85, b: 90 },
  { r: 142, g: 97, b: 80 },
  { r: 105, g: 89, b: 83 },
  { r: 246, g: 240, b: 195 },
  { r: 58, g: 54, b: 49 },
];

export const SKIN_PRESETS: Rgb[] = [
  { r: 255, g: 242, b: 242 },
  { r: 255, g: 249, b: 206 },
  { r: 255, g: 238, b: 215 },
  { r: 182, g: 136, b: 102 },
  { r: 148, g: 114, b: 87 },
  { r: 112, g: 88, b: 69 },
  { r: 255, g: 220, b: 201 },
  { r: 236, g: 186, b: 158 },
  { r: 255, g: 239, b: 231 },
  { r: 255, g: 246, b: 244 },
  { r: 234, g: 213, b: 181 },
  { r: 246, g: 203, b: 172 },
  { r: 142, g: 109, b: 84 },
  { r: 111, g: 86, b: 68 },
  { r: 254, g: 236, b: 228 },
  { r: 255, g: 233, b: 214 },
  { r: 255, g: 212, b: 184 },
];
