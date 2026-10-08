import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSaveStore } from '../store/saveStore';
import { outfitItemById } from '../lib/spriteIndex';
import { specialBonusFor } from '../lib/outfitStats';
import { loadWeaponIndex, weaponById } from '../lib/weaponIndex';
import { loadPetIndex } from '../lib/petIndex';
import { specialName } from '../lib/special';
import { MAX_LEVEL, MAX_HEALTH } from '../lib/dwellerEdit';
import {
  computeDwellerStats, maxHpAt, petBonusNote, BASE_HP, MAX_TOTAL_SPECIAL, WASTELAND_RAD_IMMUNE_END,
} from '../lib/dwellerStats';
import { SpecialIcon } from './SpecialIcon';
import { EditorTabBar } from './editor/EditorTabBar';
import { FamilyTree } from './FamilyTree';
import type { SpriteIndex } from '../types/pieces';
import type { WeaponIndex } from '../types/weapons';
import type { PetIndex } from '../types/pets';

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-zinc-700 bg-zinc-900/60 p-3" aria-label={title}>
      <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="group flex items-baseline justify-between gap-3 -mx-1.5 px-1.5 py-0.5 rounded transition-colors hover:bg-zinc-700/60" title={hint}>
      <span className="text-zinc-400 text-sm transition-colors group-hover:text-zinc-200">{label}</span>
      <span className="text-zinc-100 text-sm font-mono text-right">{value}</span>
    </div>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-zinc-500 text-xs mt-2">{children}</p>
);

/** Info button for the top-right corner of the dweller portrait; opens the stats panel. */
export function DwellerStatsButton({ index }: { index: SpriteIndex | null }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show dweller stats"
        title="Dweller stats"
        className="absolute top-1.5 right-1.5 w-11 h-11 rounded-full flex items-center justify-center bg-green-600 border-2 border-green-400 text-white shadow-lg shadow-green-900/60 ring-2 ring-green-500/30 transition-colors hover:bg-green-500 hover:border-green-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400/60"
      >
        <InfoIcon className="w-7 h-7" />
      </button>
      {open && <DwellerStatsModal index={index} onClose={close} />}
    </>
  );
}

type ModalTab = 'stats' | 'family';
const MODAL_TABS: { id: ModalTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'family', label: 'Family' },
];

function DwellerStatsModal({ index, onClose }: { index: SpriteIndex | null; onClose: () => void }) {
  const dweller = useSaveStore((s) => s.getSelectedDweller());
  const [weapons, setWeapons] = useState<WeaponIndex | null>(null);
  const [pets, setPets] = useState<PetIndex | null>(null);
  const [tab, setTab] = useState<ModalTab>('stats');

  useEffect(() => {
    let alive = true;
    loadWeaponIndex().then((w) => { if (alive) setWeapons(w); }).catch(() => {});
    loadPetIndex().then((p) => { if (alive) setPets(p); }).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { alive = false; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const outfitId = typeof dweller?.equipedOutfit?.id === 'string' ? dweller.equipedOutfit.id : null;
  const outfit = index && outfitId ? outfitItemById(index, outfitId) : null;
  const outfitName = outfit?.name ?? outfitId;

  const stats = useMemo(() => {
    if (!dweller) return null;
    const bonus = outfit?.special ?? (outfitId ? specialBonusFor(outfitId) : {});
    const weaponId = dweller.equipedWeapon?.id;
    const petId = (dweller.equippedPet as { id?: unknown } | undefined)?.id;
    return computeDwellerStats(dweller, bonus, {
      weapon: weapons && typeof weaponId === 'string' ? weaponById(weapons, weaponId) : null,
      pet: pets && typeof petId === 'string' ? pets.pets[petId] ?? null : null,
    });
  }, [dweller, outfit, outfitId, weapons, pets]);

  if (!dweller || !stats) return null;

  const { health: hp, special, weapon, pet } = stats;
  const fullName = `${dweller.name ?? ''} ${dweller.lastName ?? ''}`.trim() || 'Dweller';
  const petHp = hp.petMultiplier > 1;
  const endRow = special.find((s) => s.letter === 'E')!;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dweller stats"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[90vh] max-h-[880px] mx-4 flex flex-col rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 truncate">{fullName}</h2>
            <p className="text-sm text-zinc-400">
              Level {stats.level}
              {outfitName && <> · Wearing <span className="text-green-400">{outfitName}</span></>}
              {weapon && <> · Holding <span className="text-green-400">{weapon.name}</span></>}
              {pet && <> · With <span className="text-green-400">{pet.name}</span></>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="shrink-0 w-8 h-8 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100">
            ✕
          </button>
        </div>

        <div className="px-5 border-b border-zinc-600">
          <EditorTabBar tabs={MODAL_TABS} active={tab} onSelect={(id) => setTab(id as ModalTab)} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'family' && <FamilyTree dwellerId={dweller.serializeId} />}
          {tab === 'stats' && (
            <>
              <Section title="SPECIAL">
                <table className="w-full text-sm" aria-label="SPECIAL breakdown">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                      <th className="w-8 font-normal text-left"><span className="sr-only">Stat</span></th>
                      <th className="w-12 font-normal text-center">Base</th>
                      <th className="w-14 font-normal text-center">Outfit</th>
                      <th className="w-12 font-normal text-center">Total</th>
                      <th className="font-normal text-left pl-3">Affects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {special.map((s) => (
                      <tr key={s.letter} className="align-top border-t border-zinc-800 transition-colors hover:bg-zinc-700/50">
                        <td className="py-1.5"><SpecialIcon letter={s.letter} size={22} /></td>
                        <td className="py-1.5 text-center font-mono text-zinc-300">{s.base}</td>
                        <td className={`py-1.5 text-center font-mono ${s.outfit ? 'text-sky-400' : 'text-zinc-600'}`}>
                          {s.outfit ? `+${s.outfit}` : '—'}
                        </td>
                        <td className={`py-1.5 text-center font-mono font-semibold ${s.outfit ? 'text-sky-300' : 'text-zinc-100'}`}>
                          {s.total}
                        </td>
                        <td className="py-1.5 pl-3 text-xs text-zinc-400 leading-snug">
                          <span className="text-zinc-200">{specialName(s.letter)}</span>
                          {s.rooms.length > 0 && <> · Works in {s.rooms.join(', ')}</>}
                          <div>{s.effect}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Note>
                  Training caps base SPECIAL at 10; outfits can push a stat up to {MAX_TOTAL_SPECIAL}.
                  Pets don't add SPECIAL to adults.
                </Note>
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Health">
                  <Row label="Health" value={`${fmt(hp.current)} / ${fmt(hp.max)}`} />
                  {hp.radiation > 0 && <Row label="Radiation" value={<span className="text-red-400">{fmt(hp.radiation)}</span>} />}
                  {petHp && (
                    <Row
                      label={`Max HP with pet (+${fmt((hp.petMultiplier - 1) * 100)}%)`}
                      value={<span className="text-amber-300">{fmt(hp.max * hp.petMultiplier)}</span>}
                      hint="The pet's Health bonus only applies while it's equipped"
                    />
                  )}
                  <Row
                    label="HP per level-up"
                    value={`+${fmt(hp.perLevel)}`}
                    hint={`2.5 + 0.5 × Endurance ${hp.endurance} (${endRow.base} base${endRow.outfit ? ` + ${endRow.outfit} outfit` : ''})`}
                  />
                  {hp.levelsLeft > 0 && (
                    <Row
                      label={`Max HP at level ${MAX_LEVEL} (projected)`}
                      value={<>
                        {fmt(hp.projectedMax)}
                        {petHp && <span className="text-amber-300"> ({fmt(hp.projectedMax * hp.petMultiplier)})</span>}
                      </>}
                      hint={`${hp.levelsLeft} more level-ups at +${fmt(hp.perLevel)} each`}
                    />
                  )}
                  <Row
                    label={`Possible at level ${stats.level}`}
                    value={`${fmt(hp.minAtLevel)}–${fmt(hp.idealAtLevel)}`}
                    hint="Endurance 1 vs 17 at every level-up"
                  />
                  <Row
                    label="Wasteland radiation"
                    value={hp.radImmune
                      ? <span className="text-emerald-400">Immune</span>
                      : <span className="text-zinc-300">Needs END {WASTELAND_RAD_IMMUNE_END}+</span>}
                  />
                  <Note>
                    Dwellers start at {BASE_HP} HP and gain 2.5 + 0.5 × Endurance at each level-up (outfit included,
                    up to {MAX_TOTAL_SPECIAL}). It isn't retroactive, so raise Endurance before leveling: level {MAX_LEVEL} ranges
                    from {fmt(maxHpAt(MAX_LEVEL, 1))} HP (END 1) to {MAX_HEALTH} HP (END {MAX_TOTAL_SPECIAL}),
                    or {MAX_HEALTH * 2} HP with a +100% Health pet.
                  </Note>
                </Section>

                <Section title="Combat">
                  {weapon ? (
                    <>
                      <Row label="Weapon" value={weapon.name} />
                      <Row label="Weapon damage" value={`${weapon.min}–${weapon.max}`} />
                      {stats.petDamage > 0 && (
                        <Row
                          label={`With pet (+${fmt(stats.petDamage)})`}
                          value={<span className="text-amber-300">{fmt(weapon.min + stats.petDamage)}–{fmt(weapon.max + stats.petDamage)}</span>}
                        />
                      )}
                    </>
                  ) : (
                    <Row label="Weapon" value="None" />
                  )}
                  {stats.petResistance > 0 && (
                    <Row label="Damage resistance (pet)" value={<span className="text-amber-300">{fmt(stats.petResistance)}%</span>} />
                  )}
                  <Row label="Strength (attack)" value={special[0].total} />
                  <Row label="Agility (fire rate)" value={special[5].total} />
                  <Row label="Perception (crit arrow)" value={special[1].total} />
                  <Row label="Luck (crit meter)" value={special[6].total} />
                  <Note>
                    In quests, Agility raises fire rate, Perception slows the critical-hit arrow and Luck fills the
                    critical meter faster.
                  </Note>
                </Section>
              </div>

              <Section title="Pet">
                {pet ? (
                  <>
                    <Row label="Pet" value={pet.name} />
                    <Row label="Bonus" value={<span className="text-amber-300">{pet.label}</span>} />
                    {petBonusNote(pet.bonus) && <Note>{petBonusNote(pet.bonus)}</Note>}
                  </>
                ) : (
                  <p className="text-zinc-500 text-sm">No pet equipped.</p>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
