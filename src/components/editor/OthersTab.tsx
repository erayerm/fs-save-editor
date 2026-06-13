import { useState } from 'react';
import { useSaveStore } from '../../store/saveStore';
import { setName, setPregnancy, setLevel, setGender, MIN_LEVEL, MAX_LEVEL } from '../../lib/dwellerEdit';
import { ColorPalette } from './ColorPalette';
import { ConfirmModal } from '../ConfirmModal';
import { SKIN_PRESETS } from '../../lib/colorPresets';
import type { RenderableDweller } from '../../lib/dwellerRender';
import type { DwellerCustomization } from '../../lib/dwellerEdit';
import type { SpriteIndex } from '../../types/pieces';

export function OthersTab({
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
  const removeDweller = useSaveStore((s) => s.removeDweller);
  const [confirmEvict, setConfirmEvict] = useState(false);

  const disabled = !!dweller.isChild;
  const firstName = sel?.name ?? '';
  const lastName = sel?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || 'this dweller';
  const level = (sel as { experience?: { currentLevel?: number } } | undefined)
    ?.experience?.currentLevel ?? 1;

  // Pregnancy applies only to adult female dwellers (gender 1).
  const isFemale = dweller.gender === 1;
  const pregnant = !!(sel as { pregnant?: boolean } | undefined)?.pregnant;
  const babyReady = !!(sel as { babyReady?: boolean } | undefined)?.babyReady;

  return (
    <div className="space-y-6 px-2 pt-4">
      {/* Name editing — first thing in the Others tab */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Name</h3>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="other-first-name" className="text-zinc-400 text-xs">
              First name
            </label>
            <input
              id="other-first-name"
              type="text"
              disabled={disabled}
              value={firstName}
              onChange={(e) => updateRaw((d) => setName(d, { name: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="other-last-name" className="text-zinc-400 text-xs">
              Last name
            </label>
            <input
              id="other-last-name"
              type="text"
              disabled={disabled}
              value={lastName}
              onChange={(e) => updateRaw((d) => setName(d, { lastName: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <h3 className="text-zinc-300 text-sm font-semibold uppercase tracking-wide">Gender</h3>
        <div className="flex gap-2">
          {[{ v: 1, label: 'Female' }, { v: 2, label: 'Male' }].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              aria-pressed={dweller.gender === v}
              onClick={() => updateRaw((d) => setGender(d, v, index ?? undefined))}
              className={[
                'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50',
                dweller.gender === v ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-zinc-500 text-xs">
          Changing gender re-derives gender-specific visuals. Outfits or hair with no art for the
          new gender fall back to the default.
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
            disabled={disabled}
            onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
            className="flex-1 accent-green-500 disabled:opacity-50"
          />
          <input
            type="number"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            value={level}
            disabled={disabled}
            onChange={(e) => updateRaw((d) => setLevel(d, Number(e.target.value)))}
            className="w-20 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm text-center disabled:opacity-50"
          />
        </div>
        <p className="text-zinc-500 text-xs">
          Sets the dweller's level ({MIN_LEVEL}–{MAX_LEVEL}). Experience is reset to the start of the level.
        </p>
      </div>

      {/* Pregnancy — female dwellers only */}
      {isFemale && !disabled && (
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
            “Baby Ready” marks the pregnancy as ready to deliver. Requires Pregnant to be set.
          </p>
        </div>
      )}

      {/* Skin color */}
      <ColorPalette
        label="Skin color"
        value={dweller.skinColor ?? { r: 255, g: 224, b: 196 }}
        swatches={SKIN_PRESETS}
        onChange={(c) => onChange({ skinColor: c })}
      />

      {/* Evict (remove) the dweller */}
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
          Permanently removes this dweller from the vault.
        </p>
      </div>

      <ConfirmModal
        open={confirmEvict}
        title="Evict Dweller"
        danger
        confirmLabel="Evict"
        message={
          <span>
            Are you sure you want to evict <span className="font-semibold text-zinc-100">{fullName}</span>?
            This permanently removes them from the vault.
          </span>
        }
        onCancel={() => setConfirmEvict(false)}
        onConfirm={() => {
          if (sel) removeDweller(sel.serializeId);
          setConfirmEvict(false);
        }}
      />
    </div>
  );
}
