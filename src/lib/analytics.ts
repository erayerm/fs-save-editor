// Thin wrapper around GoatCounter (loaded via the script tag in index.html).
// Privacy-friendly and cookieless; we only ever send a count — never save data.

interface GoatCounter {
  count: (opts: { path: string; title?: string; event?: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

/**
 * Record a save-export as a custom GoatCounter event. Demo exports are tracked
 * under a separate path so real exports can be distinguished from demo trials.
 * Never throws — analytics must not interfere with the export itself.
 */
export function countExport(isDemo: boolean): void {
  try {
    window.goatcounter?.count?.({
      path: isDemo ? 'export-demo' : 'export',
      title: isDemo ? 'Exported demo save' : 'Exported save',
      event: true,
    });
  } catch {
    // ignore — a failed analytics ping must never break the export flow
  }
}
