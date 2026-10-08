import type { Special } from '../types/save';
import { roomsForStat } from './rooms';

export const SPECIAL_INFO: Record<Special, { name: string; effect: string }> = {
  S: { name: 'Strength', effect: 'Speeds up power production.' },
  P: { name: 'Perception', effect: 'Speeds up water production and helps land critical hits.' },
  E: { name: 'Endurance', effect: 'Raises health gained per level and radiation resistance; dwellers survive longer in the Wasteland.' },
  C: { name: 'Charisma', effect: 'Speeds up romance in Living Quarters and boosts Radio Studio broadcasts.' },
  I: { name: 'Intelligence', effect: 'Speeds up Stimpak and RadAway production.' },
  A: { name: 'Agility', effect: 'Speeds up food production and makes dwellers attack faster.' },
  L: { name: 'Luck', effect: 'Raises the chance of bonus caps when collecting, successful rushes, and better Wasteland loot.' },
};

function isSpecial(letter: string): letter is Special {
  return letter in SPECIAL_INFO;
}

export function specialName(letter: string): string {
  return isSpecial(letter) ? SPECIAL_INFO[letter].name : letter;
}

/**
 * Multi-line tooltip for a SPECIAL stat: name, optional context line (e.g. the
 * dweller's value or an outfit bonus), the rooms it drives, and what it does.
 */
export function specialTooltip(letter: string, detail?: string): string {
  if (!isSpecial(letter)) return detail ? `${letter}\n${detail}` : letter;
  const { name, effect } = SPECIAL_INFO[letter];
  const { work, training } = roomsForStat(letter);
  return [
    `${name} (${letter})`,
    detail,
    work.length ? `Works in: ${work.join(', ')}` : null,
    training.length ? `Trained in: ${training.join(', ')}` : null,
    effect,
  ].filter(Boolean).join('\n');
}
