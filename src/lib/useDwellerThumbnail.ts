import { useState, useEffect } from 'react';
import { renderDwellerThumbnail, thumbnailKey } from './dwellerThumbnail';
import type { RenderableDweller } from './dwellerRender';

/**
 * Returns a PNG data-URL avatar for the dweller, rendered via the shared
 * offscreen renderer (no per-component WebGL context). Re-renders only when the
 * dweller's appearance key changes. Null while loading or for child dwellers.
 */
export function useDwellerThumbnail(dweller: RenderableDweller | null): string | null {
  const key = dweller ? thumbnailKey(dweller) : null;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!dweller) { setUrl(null); return; }
    let cancelled = false;
    renderDwellerThumbnail(dweller)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return url;
}
