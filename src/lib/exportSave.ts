import { encodeSav } from './savFile';
import { reconcileLegendaryGuide } from './survivalGuide';
import type { SaveJson } from '../types/save';

export async function exportSave(save: SaveJson, fileName: string | null): Promise<void> {
  // Register roster legendaries in the Survival Guide collection at export time
  // (see reconcileLegendaryGuide) so added-then-evicted legendaries leave no entry.
  const text = await encodeSav(reconcileLegendaryGuide(save));
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? 'Vault1.sav';
  a.click();
  URL.revokeObjectURL(url);
}
