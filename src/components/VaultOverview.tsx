import { useMemo, type ReactNode } from 'react';
import { useSaveStore } from '../store/saveStore';
import { summarizeSave, MAX_DWELLER_LEVEL } from '../lib/vaultOverview';
import { CapacityBar } from './StashPanel';

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-zinc-700 bg-zinc-800/60 p-3" aria-label={title}>
      <h3 className="text-zinc-200 text-sm font-semibold uppercase tracking-wide mb-2">{title}</h3>
      <dl className="flex flex-col gap-0.5 text-sm">{children}</dl>
    </section>
  );
}

/** One label/value line; skipped when the save doesn't have the value. */
function Row({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="group flex items-baseline justify-between gap-3 -mx-1.5 px-1.5 py-0.5 rounded transition-colors hover:bg-zinc-700/60" title={title}>
      <dt className="text-zinc-400 transition-colors group-hover:text-zinc-200">{label}</dt>
      <dd className="text-zinc-100 font-mono text-right">{value}</dd>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => (
  <span className="text-zinc-500">{children}</span>
);

export function VaultOverview() {
  const save = useSaveStore((s) => s.save);
  const data = useMemo(() => (save ? summarizeSave(save) : null), [save]);
  if (!data) return null;

  const { dwellers: dw, rooms, inventory: inv, lifetime: life } = data;
  const pct = (n: number) => (dw.total > 0 ? ` (${Math.round((n / dw.total) * 100)}%)` : '');

  return (
    <section aria-label="Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card title="Vault">
          <Row label="Mode" value={
            <span className={data.mode === 'Survival' ? 'text-red-400' : undefined}>{data.mode}</span>
          } />
          <Row label="Created" value={fmtDate(data.createdAt)} />
          <Row label="Last saved" value={fmtDate(data.savedAt)} />
          <Row label="Game version" value={data.appVersion} />
          <Row label="Device" value={data.deviceName} />
          <Row label="Mr. Handy robots" value={fmt(data.mrHandies)} />
          <Row label="Wasteland teams" value={fmt(data.wastelandTeams)} />
        </Card>

        <Card title="Dwellers">
          <Row label="Population" value={fmt(dw.total)} />
          <Row label="Male / Female" value={`${fmt(dw.male)} / ${fmt(dw.female)}`} />
          <Row label="Adults / Children" value={`${fmt(dw.adults)} / ${fmt(dw.children)}`} />
          <Row label="Common / Rare / Legendary" value={
            <>
              {fmt(dw.rarity.common)} / <span className="text-sky-400">{fmt(dw.rarity.rare)}</span>
              {' / '}<span className="text-amber-400">{fmt(dw.rarity.legendary)}</span>
            </>
          } />
          <Row label="Average level" value={<>{fmt1(dw.avgLevel)} <Muted>(max {dw.maxLevel})</Muted></>} />
          <Row label={`At level ${MAX_DWELLER_LEVEL}`} value={`${fmt(dw.atMaxLevel)}${pct(dw.atMaxLevel)}`} />
          <Row label="Maxed SPECIAL" value={`${fmt(dw.maxedSpecial)}${pct(dw.maxedSpecial)}`}
            title="Every SPECIAL stat at 10, not counting outfit bonuses" />
          <Row label="Average happiness" value={`${fmt1(dw.avgHappiness)}%`} />
          <Row label="Assigned to rooms" value={`${fmt(dw.assigned)}${pct(dw.assigned)}`} />
          <Row label="Pregnant" value={fmt(dw.pregnant)} />
          <Row label="With a weapon / outfit" value={`${fmt(dw.armed)} / ${fmt(dw.dressed)}`}
            title="Anything other than the default Fist and Vault Jumpsuit" />
          <Row label="With a pet" value={fmt(dw.withPet)} />
        </Card>

        <Card title="Resources">
          {data.resources.map(({ key, label, value }) => (
            <Row key={key} label={label} value={fmt(value)} />
          ))}
        </Card>

        <Card title="Rooms">
          <Row label="Total rooms" value={fmt(rooms.total)} />
          <Row label="Floors" value={rooms.floors > 0 ? fmt(rooms.floors) : null} />
          <Row label="Fully upgraded" value={fmt(rooms.maxUpgraded)} />
          {rooms.byClass.map(({ name, count }) => (
            <Row key={name} label={name} value={fmt(count)} />
          ))}
        </Card>

        <Card title="Storage">
          <div className="mb-1">
            <CapacityBar used={inv.stashUsed} capacity={inv.stashCapacity} />
          </div>
          <Row label="Weapons" value={fmt(inv.weapons)} />
          <Row label="Outfits" value={fmt(inv.outfits)} />
          <Row label="Pets" value={fmt(inv.pets)} />
          <Row label="Junk" value={fmt(inv.junk)} />
          <Row label="Pets owned (vault)" value={
            <span className={inv.petsOwned >= inv.petsMax ? 'text-red-400' : undefined}>
              {fmt(inv.petsOwned)} / {fmt(inv.petsMax)}
            </span>
          } title="Equipped plus stashed pets" />
        </Card>

        {Object.values(life).some((v) => v !== null) && <Card title="Lifetime">
          <Row label="Dwellers ever" value={life.totalDwellers === null ? null : fmt(life.totalDwellers)} />
          <Row label="Babies born" value={life.babiesBorn === null ? null : fmt(life.babiesBorn)} />
          <Row label="Dwellers died" value={life.deadDwellers === null ? null : fmt(life.deadDwellers)} />
          <Row label="Levels gained" value={life.levelsGained === null ? null : fmt(life.levelsGained)} />
          <Row label="Lunchboxes opened" value={life.lunchboxesOpened === null ? null : fmt(life.lunchboxesOpened)} />
          <Row label="Incidents stopped" value={life.incidentsStopped === null ? null : fmt(life.incidentsStopped)} />
          <Row label="Fires put out" value={life.firesExtinguished === null ? null : fmt(life.firesExtinguished)} />
          <Row label="Rushes (ok / failed)" value={life.rushes && `${fmt(life.rushes.ok)} / ${fmt(life.rushes.failed)}`} />
          <Row label="Items crafted" value={life.craftedItems === null ? null : fmt(life.craftedItems)} />
          <Row label="Quests completed" value={life.questsCompleted === null ? null : fmt(life.questsCompleted)} />
        </Card>}
      </div>
    </section>
  );
}
