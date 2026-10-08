import { useState } from 'react';
import { useSaveStore } from '../store/saveStore';
import {
  getCaps, setCaps, setResource,
  BOX_TYPES, type BoxType, getBoxCount, setBoxCount,
  getVaultMode, setVaultMode, type VaultMode,
} from '../lib/vaultEdit';
import { StashPanel } from './StashPanel';
import { VaultOverview } from './VaultOverview';
import { EditorTabBar } from './editor/EditorTabBar';

type VaultTab = 'overview' | 'resources' | 'stash';
const TABS: { id: VaultTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'resources', label: 'Resources' },
  { id: 'stash', label: 'Stash' },
];

const RESOURCE_KEYS = ['Food', 'Energy', 'Water', 'StimPack', 'RadAway', 'NukaColaQuantum'] as const;

// Lunchbox-style item types, in display order.
const BOX_FIELDS: { type: BoxType; id: string; label: string }[] = [
  { type: BOX_TYPES.Lunchbox, id: 'lunchboxes', label: 'Lunchboxes' },
  { type: BOX_TYPES.MrHandy, id: 'mr-handies', label: 'Mr. Handies' },
  { type: BOX_TYPES.PetCarrier, id: 'pet-carriers', label: 'Pet Carriers' },
  { type: BOX_TYPES.StarterPack, id: 'starter-packs', label: 'Starter Packs' },
];

export function VaultSettings() {
  const save = useSaveStore((s) => s.save);
  const setVault = useSaveStore((s) => s.setVault);
  const [tab, setTab] = useState<VaultTab>('overview');

  if (!save) return null;

  const caps = getCaps(save);
  const vaultMode = getVaultMode(save);
  const resources = (save.vault as any)?.storage?.resources ?? {};
  const vaultName = (save.vault as any)?.VaultName;

  function handleCaps(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    setVault((s) => setCaps(s, isNaN(n) ? 0 : n));
  }

  function handleBox(type: BoxType) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setVault((s) => setBoxCount(s, type, isNaN(n) ? 0 : n));
    };
  }

  function handleVaultMode(e: React.ChangeEvent<HTMLSelectElement>) {
    const mode = e.target.value as VaultMode;
    setVault((s) => setVaultMode(s, mode));
  }

  function handleResource(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setVault((s) => setResource(s, key, isNaN(n) ? 0 : n));
    };
  }

  return (
    <div className="h-full flex flex-col pt-8 p-2">
      <h2 className="text-emerald-400 text-xl font-bold mb-6 tracking-wide">Vault Settings</h2>

      {vaultName && (
        <div className="mb-4 text-zinc-300 text-sm">
          <span className="text-zinc-500 mr-2">Vault Name:</span>
          <span className="font-medium">{vaultName}</span>
        </div>
      )}

      <div className="border-b border-zinc-600">
        <EditorTabBar tabs={TABS} active={tab} onSelect={(id) => setTab(id as VaultTab)} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-4 pr-1">
        {tab === 'overview' && <VaultOverview />}
        {tab === 'resources' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="vault-caps" className="text-zinc-400 text-sm">Caps</label>
              <input
                id="vault-caps"
                type="number"
                className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                value={caps}
                onChange={handleCaps}
              />
            </div>

            {BOX_FIELDS.map(({ type, id, label }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={`vault-${id}`} className="text-zinc-400 text-sm">{label}</label>
                <input
                  id={`vault-${id}`}
                  type="number"
                  min={0}
                  className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  value={getBoxCount(save, type)}
                  onChange={handleBox(type)}
                />
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label htmlFor="vault-mode" className="text-zinc-400 text-sm">Vault Mode</label>
              <select
                id="vault-mode"
                className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                value={vaultMode}
                onChange={handleVaultMode}
              >
                <option value="Normal">Normal</option>
                <option value="Survival">Survival</option>
              </select>
            </div>

            {RESOURCE_KEYS.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={`vault-resource-${key}`} className="text-zinc-400 text-sm">{key}</label>
                <input
                  id={`vault-resource-${key}`}
                  type="number"
                  className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  value={resources[key] ?? 0}
                  onChange={handleResource(key)}
                />
              </div>
            ))}
          </div>
        )}
        {tab === 'stash' && <StashPanel />}
      </div>
    </div>
  );
}
