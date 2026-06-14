// Pure parser for a single legendary dweller asset (MonoBehaviour/L_*.asset).
// `resolveGuid(guid) -> pieceName|null` maps a referenced asset .meta guid to
// that asset's m_Name (hair / facemask piece names).

const STAT_KEYS = ['m_strength', 'm_perception', 'm_endurance', 'm_charisma', 'm_intelligence', 'm_agility', 'm_luck'];

function grab(text, re) {
  const m = text.match(re);
  return m ? m[1] : null;
}

// "{fileID: 0}" -> null ; "{fileID: 11400000, guid: abc, type: 2}" -> "abc"
function pieceGuid(text, field) {
  const block = grab(text, new RegExp(`(?:^|\\n)\\s*${field}:\\s*\\{([^}]*)\\}`));
  if (block == null) return null;
  const fileId = block.match(/fileID:\s*(\d+)/)?.[1];
  if (!fileId || fileId === '0') return null;
  return block.match(/guid:\s*([^\s,}]+)/)?.[1] ?? null;
}

function colorInt(text, field) {
  const block = grab(text, new RegExp(`(?:^|\\n)\\s*${field}:\\s*\\{([^}]*)\\}`));
  if (block == null) return 0xffffffff;
  const num = (ch) => Number(block.match(new RegExp(`${ch}:\\s*([\\d.]+)`))?.[1] ?? 1);
  const to255 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const r = to255(num('r')), g = to255(num('g')), b = to255(num('b'));
  return ((0xff << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export function parseLegendaryAsset(text, resolveGuid) {
  // Skip records lacking SPECIAL (e.g. Mr-Handy-style L_SnipSnip).
  if (!STAT_KEYS.every((k) => new RegExp(`${k}:\\s*\\d+`).test(text))) return null;

  const uniqueData = grab(text, /^\s*m_Name:\s*(.+?)\s*$/m);
  const rawGender = grab(text, /m_gender:\s*(\d+)/);
  if (!uniqueData || rawGender == null) return null;
  const assetGender = Number(rawGender);

  const hairGuid = pieceGuid(text, 'm_hairPiece');
  const faceGuid = pieceGuid(text, 'm_facemask');

  return {
    uniqueData,
    name: (grab(text, /^\s*m_name:[^\S\r\n]*([^\r\n]*)/m) ?? '').trim(),
    lastName: (grab(text, /^\s*m_lastName:[^\S\r\n]*([^\r\n]*)/m) ?? '').trim(),
    gender: assetGender === 1 ? 2 : 1, // invert to save encoding (male=2, female=1)
    special: STAT_KEYS.map((k) => Number(grab(text, new RegExp(`${k}:\\s*(\\d+)`)))),
    outfitId: (grab(text, /m_outfitItemId:[^\S\r\n]*([^\r\n]*)/m) ?? '').trim(),
    weaponId: (grab(text, /m_weaponItemId:[^\S\r\n]*([^\r\n]*)/m) ?? '').trim(),
    skinColor: colorInt(text, 'm_skinColor'),
    hairColor: colorInt(text, 'm_hairColor'),
    hair: hairGuid ? resolveGuid(hairGuid) : null,
    faceMask: faceGuid ? resolveGuid(faceGuid) : null,
  };
}
