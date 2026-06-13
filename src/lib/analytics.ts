// Thin wrapper around Vercel Web Analytics (the <Analytics/> component is mounted
// in main.tsx). Privacy-friendly; we only ever send a count — never save data.
import { track } from '@vercel/analytics';

/**
 * Record a save-export as a custom Vercel Analytics event. Demo exports are tracked
 * under a separate event name so real exports can be distinguished from demo trials.
 * Never throws — analytics must not interfere with the export itself.
 */
export function countExport(isDemo: boolean): void {
  try {
    track(isDemo ? 'Exported demo save' : 'Exported save');
  } catch {
    // ignore — a failed analytics ping must never break the export flow
  }
}
