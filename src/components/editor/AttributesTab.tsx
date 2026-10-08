import { useCallback, useState } from 'react';
import { useSaveStore } from '../../store/saveStore';
import {
  setName, setPregnancy, setLevel, setGender, MIN_LEVEL, MAX_LEVEL,
  getHealth, setHealth, healDweller, MAX_HEALTH,
  getHappiness, setHappiness, MAX_HAPPINESS,
  getRarity, setRarity, DWELLER_RARITIES,
} from '../../lib/dwellerEdit';
import { ColorPalette } from './ColorPalette';
import { EvictDialog } from './EvictDialog';
import { requestGearChange } from './GearSwapDialog';
import { SKIN_PRESETS } from '../../lib/colorPresets';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { SpriteIndex } from '../../types/pieces';

/**
 * Number input that applies its value on blur or Enter (Escape reverts), so
 * typing "250" doesn't pass through 2 and 25 — which would clamp linked values.
 */
function NumberField({ id, value, min, max, step = 1, ariaLabel, onCommit }: {
  id: string; value: number; min: number; max: number; step?: number; ariaLabel?: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
      className="w-24 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center"
    />
  );
}

/** Green health, red radiation, grey for the rest of max health. */
function HealthBar({ health, maxHealth, radiation }: { health: number; maxHealth: number; radiation: number }) {
  const pct = (n: number) => `${maxHealth > 0 ? Math.min(100, (n / maxHealth) * 100) : 0}%`;
  return (
    <div className="relative h-2 rounded-full bg-zinc-700 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: pct(health) }} />
      <div className="absolute inset-y-0 right-0 bg-red-500" style={{ width: pct(radiation) }} />
    </div>
  );
}

const RARITY_STYLE: Record<string, string> = {
  Common: 'bg-green-600 text-white',
  Rare: 'bg-sky-600 text-white',
  Legendary: 'bg-amber-500 text-zinc-900',
};

export function AttributesTab({
  dweller,
  onChange,
  index,
}: {
  dweller: RenderableDweller;
  onChange: (patch: DwellerCustomization) => void;
  index: SpriteIndex | null;
}) {
  const sel = useSaveStore((s) => s.getSelectedDweller());
  const updateRaw = useSaveStore((s) => s.updateSelectedDwellerRaw);
  const [confirmEvict, setConfirmEvict] = useState(false);
  const closeEvict = useCallback(() => setConfirmEvict(false), []);

  const firstName = sel?.name ?? '';
  const lastName = sel?.lastName ?? '';
  const level = (sel as { experience?: { currentLevel?: number } } | undefined)
    ?.experience?.currentLevel ?? 1;

  // Pregnancy applies only to female dwellers (gender 1).
  const isFemale = dweller.gender === 1;
  const pregnant = !!(sel as { pregnant?: boolean } | undefined)?.pregnant;
  const babyReady = !!(sel as { babyReady?: boolean } | undefined)?.babyReady;

  const vitals = sel ? getHealth(sel) : { health: 0, maxHealth: 0, radiation: 0 };
  const fullyHealed = vitals.health >= vitals.maxHealth && vitals.radiation === 0;
  const happiness = sel ? getHappiness(sel) : MAX_HAPPINESS;
  const rarity = sel ? getRarity(sel) : 'Common';

  return (
    <div className="space-y-6 px-2 pt-4">
      {/* Name editing — shown for everyone, children included */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Name</h3>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="attr-first-name" className="text-zinc-400 text-xs">First name</label>
            <input
              id="attr-first-name"
              type="text"
              value={firstName}
              onChange={(e) => updateRaw((d) => setName(d, { name: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="attr-last-name" className="text-zinc-400 text-xs">Last name</label>
            <input
              id="attr-last-name"
              type="text"
              value={lastName}
              onChange={(e) => updateRaw((d) => setName(d, { lastName: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Adult-only sections: children only get Name + Danger Zone. */}
      {!dweller.isChild && (
        <>
          {/* Skin color */}
          <ColorPalette
            label="Skin color"
            labelClassName="text-zinc-300 text-sm font-semibold uppercase tracking-wide"
            value={dweller.skinColor ?? { r: 255, g: 224, b: 196 }}
            swatches={SKIN_PRESETS}
            onChange={(c) => onChange({ skinColor: c })}
          />

          {/* Gender */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Gender</h3>
            <div className="flex gap-2">
              {[{ v: 1, label: 'Female' }, { v: 2, label: 'Male' }].map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={dweller.gender === v}
                  onClick={() => requestGearChange((d) => setGender(d, v, index ?? undefined))}
                  className={[
                    'px-3 py-1.5 rounded text-sm font-medium',
                    dweller.gender === v ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-zinc-500 text-xs">
              Changing gender re-derives gender-specific visuals. Outfits or hair with no art for the
              new gender fall back to the default (you'll be asked whether to stash the removed outfit).
            </p>
          </div>

          {/* Level (1..50) */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Level</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_LEVEL}
                max={MAX_LEVEL}
                value={level}
                onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
                className="flex-1 accent-green-500"
              />
              <input
                type="number"
                min={MIN_LEVEL}
                max={MAX_LEVEL}
                value={level}
                onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
                className="w-20 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center"
              />
            </div>
            <p className="text-zinc-500 text-xs">
              Sets the dweller's level ({MIN_LEVEL}–{MAX_LEVEL}). Experience is reset to the start of the level.
            </p>
          </div>

          {/* Health, max health and radiation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Health</h3>
              <button
                type="button"
                onClick={() => updateRaw(healDweller)}
                disabled={fullyHealed}
                className="px-3 py-1 rounded text-sm font-medium bg-zinc-700 text-zinc-200 hover:bg-green-600 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-700 disabled:hover:text-zinc-200 disabled:cursor-not-allowed"
              >
                Heal fully
              </button>
            </div>
            <HealthBar {...vitals} />
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="attr-health" className="text-zinc-400 text-xs">Health</label>
                <NumberField id="attr-health" value={vitals.health} min={1} max={vitals.maxHealth} step={0.5}
                  onCommit={(n) => updateRaw((d) => setHealth(d, { health: n }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="attr-max-health" className="text-zinc-400 text-xs">Max health</label>
                <NumberField id="attr-max-health" value={vitals.maxHealth} min={1} max={MAX_HEALTH} step={0.5}
                  onCommit={(n) => updateRaw((d) => setHealth(d, { maxHealth: n }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="attr-radiation" className="text-zinc-400 text-xs">Radiation</label>
                <NumberField id="attr-radiation" value={vitals.radiation} min={0} max={vitals.maxHealth} step={0.5}
                  onCommit={(n) => updateRaw((d) => setHealth(d, { radiation: n }))} />
              </div>
            </div>
            <p className="text-zinc-500 text-xs">
              Max health goes up to {MAX_HEALTH}, the most a level {MAX_LEVEL} dweller can reach in-game.
              Radiation eats into max health, so health can't go above max health minus radiation.
            </p>
          </div>

          {/* Happiness (0..100) */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Happiness</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={MAX_HAPPINESS}
                value={happiness}
                aria-label="Happiness slider"
                onChange={(e) => updateRaw((d) => setHappiness(d, Number(e.target.value)))}
                className="flex-1 accent-green-500"
              />
              <NumberField id="attr-happiness" ariaLabel="Happiness" value={happiness} min={0} max={MAX_HAPPINESS}
                onCommit={(n) => updateRaw((d) => setHappiness(d, n))} />
            </div>
            <p className="text-zinc-500 text-xs">
              Happiness (0–100%) also sets the dweller's facial expression. The game keeps adjusting it over time.
            </p>
          </div>

          {/* Rarity */}
          <div className="space-y-3">
            <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Rarity</h3>
            <div className="flex gap-2">
              {DWELLER_RARITIES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={rarity === r}
                  onClick={() => updateRaw((d) => setRarity(d, r))}
                  className={[
                    'px-3 py-1.5 rounded text-sm font-medium',
                    rarity === r ? RARITY_STYLE[r] : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-zinc-500 text-xs">
              Changes the rarity tag only. It doesn't turn the dweller into a specific legendary character.
            </p>
          </div>

          {/* Pregnancy — female dwellers only */}
          {isFemale && (
            <div className="space-y-3">
              <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Pregnancy</h3>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={pregnant}
                  onChange={(e) => updateRaw((d) => setPregnancy(d, { pregnant: e.target.checked }))}
                  className="accent-green-400"
                />
                Pregnant
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={babyReady}
                  disabled={!pregnant}
                  onChange={(e) => updateRaw((d) => setPregnancy(d, { babyReady: e.target.checked }))}
                  className="accent-green-400 disabled:opacity-50"
                />
                <span className={pregnant ? '' : 'opacity-50'}>Baby Ready</span>
              </label>
              <p className="text-zinc-500 text-xs">
                "Baby Ready" marks the pregnancy as ready to deliver. Requires Pregnant to be set.
              </p>
            </div>
          )}
        </>
      )}

      {/* Evict (remove) the dweller — Danger Zone, shown for everyone */}
      <div className="space-y-3 pt-2 border-t border-zinc-700">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Danger Zone</h3>
        <button
          type="button"
          onClick={() => setConfirmEvict(true)}
          className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
        >
          Evict Dweller
        </button>
        <p className="text-zinc-500 text-xs">
          Permanently removes this dweller from the vault. You can move their weapon, outfit and pet to the stash first.
        </p>
      </div>

      <EvictDialog dweller={confirmEvict ? sel : null} onClose={closeEvict} />
    </div>
  );
}
