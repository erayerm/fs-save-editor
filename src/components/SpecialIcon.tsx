import { specialTooltip } from '../lib/special';

/**
 * The bright Pip-Boy / Fallout Shelter UI green used for SPECIAL stat circles.
 * Matches the in-game stat-bar accent green.
 */
export const FALLOUT_GREEN = '#15ff5d';

/**
 * A SPECIAL stat letter (S/P/E/C/I/A/L) shown the way the game UI does it:
 * the bare letter inside a green circle. Hovering explains the stat; `detail`
 * adds a context line such as the dweller's value or an outfit bonus.
 */
export function SpecialIcon({ letter, size = 20, detail }: { letter: string; size?: number; detail?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.6,
        border: `1px solid ${FALLOUT_GREEN}`,
        color: FALLOUT_GREEN,
      }}
      title={specialTooltip(letter, detail)}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
