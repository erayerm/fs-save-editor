import type { Special } from '../../lib/outfitStats';
import { SpecialIcon } from '../SpecialIcon';

const SPECIAL_ORDER: Special[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

interface Props {
  bonus: Partial<Record<Special, number>>;
  /**
   * Inline layout: each stat shown as a small icon with its value beside it
   * ("S +2  P +3") instead of the value stacked below a large icon.
   */
  inline?: boolean;
}

export function SpecialBadges({ bonus, inline = false }: Props) {
  const entries = SPECIAL_ORDER.filter((s) => bonus[s] != null && bonus[s]! > 0);
  if (entries.length === 0) return null;

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-white">
        {entries.map((s) => (
          <span key={s} className="flex items-center gap-0.5 leading-none">
            <SpecialIcon letter={s} size={11} title={`${s} +${bonus[s]}`} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{`+${bonus[s]}`}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-0.5 justify-center items-end">
      {entries.map((s) => (
        <span key={s} className="flex flex-col items-center leading-none text-white">
          <SpecialIcon letter={s} size={26} title={`${s} +${bonus[s]}`} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{`+${bonus[s]}`}</span>
        </span>
      ))}
    </div>
  );
}
