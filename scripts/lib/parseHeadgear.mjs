// Extract DwellerLargeHeadgear placement vectors from an AssetRipper .asset text.
export function parseHeadgearPlacement(text) {
  const vec = (re) => {
    const m = text.match(re);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : undefined;
  };
  const result = {
    grabPoint: vec(/m_grabPoint:\s*\{x:\s*(-?[0-9.eE+-]+),\s*y:\s*(-?[0-9.eE+-]+)\}/),
    offset: vec(/m_offset:\s*\{x:\s*(-?[0-9.eE+-]+),\s*y:\s*(-?[0-9.eE+-]+)\}/),
    scale: vec(/m_scale:\s*\{x:\s*(-?[0-9.eE+-]+),\s*y:\s*(-?[0-9.eE+-]+)\}/),
  };
  // Return null if no fields were found (empty/irrelevant text)
  if (!result.grabPoint && !result.offset && !result.scale) return null;
  return result;
}
