import { useSaveStore } from '../store/saveStore';
import { getCaps, setCaps, getLunchboxes, setLunchboxes, setResource } from '../lib/vaultEdit';

const RESOURCE_KEYS = ['Food', 'Energy', 'Water', 'StimPack', 'RadAway', 'NukaColaQuantum'] as const;

export function VaultSettings() {
  const save = useSaveStore((s) => s.save);
  const setVault = useSaveStore((s) => s.setVault);

  if (!save) return null;

  const caps = getCaps(save);
  const lunchboxes = getLunchboxes(save);
  const resources = (save.vault as any)?.storage?.resources ?? {};
  const vaultName = (save.vault as any)?.VaultName;

  function handleCaps(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    setVault((s) => setCaps(s, isNaN(n) ? 0 : n));
  }

  function handleLunchboxes(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    setVault((s) => setLunchboxes(s, isNaN(n) ? 0 : n));
  }

  function handleResource(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setVault((s) => setResource(s, key, isNaN(n) ? 0 : n));
    };
  }

  return (
    <div className="max-w-lg mx-auto mt-8 bg-zinc-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-emerald-400 text-xl font-bold mb-6 tracking-wide">Vault Settings</h2>

      {vaultName && (
        <div className="mb-4 text-zinc-300 text-sm">
          <span className="text-zinc-500 mr-2">Vault Name:</span>
          <span className="font-medium">{vaultName}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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

        <div className="flex flex-col gap-1">
          <label htmlFor="vault-lunchboxes" className="text-zinc-400 text-sm">Lunchboxes</label>
          <input
            id="vault-lunchboxes"
            type="number"
            className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
            value={lunchboxes}
            onChange={handleLunchboxes}
          />
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
    </div>
  );
}
