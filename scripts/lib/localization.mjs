// Parse an I2 Localization prefab (Resources/I2Languages.prefab): map each
// localization Term to its English string (the first entry in Languages).
export function parseLocalization(text) {
  const lines = text.split(/\r?\n/);
  const map = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*- Term:\s*(.+?)\s*$/);
    if (!m) continue;
    const term = m[1];
    for (let j = i + 1; j < lines.length && j < i + 12; j++) {
      if (/^\s*- Term:/.test(lines[j])) break; // next term, no Languages found
      if (/^\s*Languages:\s*$/.test(lines[j])) {
        const v = lines[j + 1].match(/^\s*-\s?(.*)$/);
        if (v) map.set(term, v[1].trim());
        break;
      }
    }
  }
  return map;
}
