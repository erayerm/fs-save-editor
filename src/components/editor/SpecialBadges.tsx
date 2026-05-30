import type { Special } from '../../lib/outfitStats';

const SPECIAL_ORDER: Special[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];

const LETTER_COLORS: Record<Special, string> = {
  S: 'bg-red-700',
  P: 'bg-yellow-600',
  E: 'bg-green-700',
  C: 'bg-blue-600',
  I: 'bg-cyan-600',
  A: 'bg-purple-700',
  L: 'bg-pink-600',
};

interface Props {
  bonus: Partial<Record<Special, number>>;
}

export function SpecialBadges({ bonus }: Props) {
  const entries = SPECIAL_ORDER.filter((s) => bonus[s] != null && bonus[s]! > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-0.5 justify-center">
      {entries.map((s) => (
        <span
          key={s}
          title={`${s} +${bonus[s]}`}
          className={`${LETTER_COLORS[s]} text-white rounded flex flex-col items-center leading-none px-0.5 py-0.5`}
          style={{ fontSize: 9, minWidth: 18 }}
        >
          <span style={{ fontWeight: 700 }}>{s}</span>
          <span style={{ fontSize: 8 }}>{`+${bonus[s]}`}</span>
        </span>
      ))}
    </div>
  );
}
