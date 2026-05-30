import { encodeSav } from './savFile';
import type { SaveJson } from '../types/save';

export async function exportSave(save: SaveJson, fileName: string | null): Promise<void> {
  const text = await encodeSav(save);
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? 'Vault1.sav';
  a.click();
  URL.revokeObjectURL(url);
}
