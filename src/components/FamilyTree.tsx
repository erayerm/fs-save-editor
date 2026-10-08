import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { editDweller, useSaveStore } from '../store/saveStore';
import { ascendantsOf, getFamily, type RelativeRef } from '../lib/family';
import { setName } from '../lib/dwellerEdit';
import type { Dweller } from '../types/save';

// ---------------------------------------------------------------------------
// Family tree diagram: grandparents → parents → dweller (with siblings and
// partners) → children → grandchildren. Nodes are laid out in flex rows and the
// connecting lines are drawn in an SVG overlay from the nodes' measured
// positions, so rows can wrap freely.
// ---------------------------------------------------------------------------

type TreeNode =
  | { key: string; role: string; kind: 'dweller'; dweller: Dweller; self?: boolean }
  | { key: string; role: string; kind: 'gone' | 'unknown' };

interface Edge {
  from: string;
  to: string;
  /** Partner links are drawn sideways between nodes in the same row. */
  style?: 'partner' | 'lastPartner';
}

const fullNameOf = (d: Dweller) => `${d.name ?? ''} ${d.lastName ?? ''}`.trim() || `Dweller #${d.serializeId}`;

function nodeFor(key: string, role: string, ref: RelativeRef | null): TreeNode {
  if (!ref) return { key, role, kind: 'unknown' };
  if (ref.kind === 'gone') return { key, role, kind: 'gone' };
  return { key, role, kind: 'dweller', dweller: ref.dweller };
}

/** Text input that applies on blur or Enter (Escape reverts), so names can contain spaces. */
function NameInput({ value, placeholder, label, onCommit }: {
  value: string; placeholder: string; label: string; onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim() !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      type="text"
      value={draft ?? value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
      className="w-full min-w-0 bg-zinc-700 text-zinc-100 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
    />
  );
}

const NODE_BASE = 'w-40 min-h-[64px] rounded-md border px-2 py-1.5 text-left flex flex-col gap-0.5';

interface RenameState {
  selected: ReadonlySet<number>;
  toggle: (id: number) => void;
}

function NodeCard({ node, rename: renameState }: { node: TreeNode; rename: RenameState | null }) {
  const selectDweller = useSaveStore((s) => s.selectDweller);
  const updateDwellerRaw = useSaveStore((s) => s.updateDwellerRaw);
  const role = <span className="text-[10px] uppercase tracking-wide text-zinc-500 truncate">{node.role}</span>;

  if (node.kind !== 'dweller') {
    return (
      <div data-node={node.key} className={`${NODE_BASE} border-dashed border-zinc-700 bg-zinc-900/40`}>
        {role}
        <span className="text-xs italic text-zinc-500">{node.kind === 'gone' ? 'Left the vault' : 'Unknown'}</span>
      </div>
    );
  }

  const d = node.dweller;
  const female = d.gender === 1;
  const gender = (
    <span className={female ? 'text-pink-400' : 'text-sky-400'} aria-label={female ? 'female' : 'male'}>
      {female ? '♀' : '♂'}
    </span>
  );
  const tone = node.self
    ? 'border-green-500 bg-green-950/40 ring-2 ring-green-500/30'
    : 'border-zinc-600 bg-zinc-800';

  if (renameState) {
    const rename = (patch: { name?: string; lastName?: string }) =>
      updateDwellerRaw(d.serializeId, (x) => setName(x, patch));
    const checked = renameState.selected.has(d.serializeId);
    return (
      <div
        data-node={node.key}
        className={`${NODE_BASE} ${checked ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/30' : tone}`}
      >
        <label className="flex items-center gap-1 cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => renameState.toggle(d.serializeId)}
            aria-label={`Select ${fullNameOf(d)} (${node.role})`}
            className="accent-amber-400 shrink-0"
          />
          {gender}{role}
        </label>
        <NameInput value={d.name ?? ''} placeholder="First name" label={`First name (${node.role})`}
          onCommit={(v) => rename({ name: v })} />
        <NameInput value={d.lastName ?? ''} placeholder="Last name" label={`Last name (${node.role})`}
          onCommit={(v) => rename({ lastName: v })} />
      </div>
    );
  }

  const body = (
    <>
      {role}
      <span className="flex items-center gap-1 text-sm text-zinc-100 min-w-0">
        {gender}
        <span className="truncate" title={fullNameOf(d)}>{fullNameOf(d)}</span>
      </span>
      <span className="text-[11px] text-zinc-500">Lv {d.experience?.currentLevel ?? 1}</span>
    </>
  );
  if (node.self) return <div data-node={node.key} className={`${NODE_BASE} ${tone}`}>{body}</div>;
  return (
    <button
      type="button"
      data-node={node.key}
      onClick={() => selectDweller(d.serializeId)}
      title={`Show ${fullNameOf(d)}`}
      className={`${NODE_BASE} ${tone} hover:border-green-500 transition-colors`}
    >
      {body}
    </button>
  );
}

function Row({ nodes, rename, gapClass = 'gap-3' }: {
  nodes: TreeNode[]; rename: RenameState | null; gapClass?: string;
}) {
  if (nodes.length === 0) return null;
  return (
    <div className={`flex flex-wrap justify-center items-start ${gapClass}`}>
      {nodes.map((n) => <NodeCard key={n.key} node={n} rename={rename} />)}
    </div>
  );
}

export function FamilyTree({ dwellerId }: { dwellerId: number }) {
  const save = useSaveStore((s) => s.save);
  const setVault = useSaveStore((s) => s.setVault);
  const [renaming, setRenaming] = useState(false);
  const [bulkLastName, setBulkLastName] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());

  const toggleSelected = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const renameState = useMemo<RenameState | null>(
    () => (renaming ? { selected, toggle: toggleSelected } : null),
    [renaming, selected, toggleSelected],
  );

  const [prevDwellerId, setPrevDwellerId] = useState(dwellerId);
  if (prevDwellerId !== dwellerId) {
    setPrevDwellerId(dwellerId);
    setSelected(new Set());
  }

  const tree = useMemo(() => {
    const family = save ? getFamily(save, dwellerId) : null;
    const self = save?.dwellers.dwellers.find((d) => d.serializeId === dwellerId);
    if (!family || !self) return null;

    const edges: Edge[] = [];
    const idOf = (ref: RelativeRef | null) => (ref?.kind === 'present' ? ref.dweller.serializeId : null);
    const [fatherId, motherId] = ascendantsOf(self);

    const hasGrandparents = family.grandparents.some((g) => g.ref);
    const grandparents = hasGrandparents
      ? family.grandparents.map((g, i) => nodeFor(`gp${i}`, g.label, g.ref))
      : [];
    const hasParents = hasGrandparents || !!family.father || !!family.mother;
    const parents = hasParents
      ? [nodeFor('father', 'Father', family.father), nodeFor('mother', 'Mother', family.mother)]
      : [];
    family.grandparents.forEach((g, i) => {
      if (g.ref) edges.push({ from: `gp${i}`, to: i < 2 ? 'father' : 'mother' });
    });
    if (family.father) edges.push({ from: 'father', to: 'self' });
    if (family.mother) edges.push({ from: 'mother', to: 'self' });

    const siblings: TreeNode[] = family.siblings.map(({ dweller, half }) => {
      const key = `sib-${dweller.serializeId}`;
      const [f, m] = ascendantsOf(dweller);
      if (family.father && fatherId > 0 && f === fatherId) edges.push({ from: 'father', to: key });
      if (family.mother && motherId > 0 && m === motherId) edges.push({ from: 'mother', to: key });
      return { key, role: half ? 'Half-sibling' : 'Sibling', kind: 'dweller', dweller };
    });

    const selfRow: TreeNode[] = [
      ...siblings,
      { key: 'self', role: 'This dweller', kind: 'dweller', dweller: self, self: true },
    ];
    if (family.partner) {
      selfRow.push(nodeFor('partner', 'Partner', family.partner));
      edges.push({ from: 'self', to: 'partner', style: 'partner' });
    }
    if (family.lastPartner) {
      selfRow.push(nodeFor('lastPartner', 'Last partner', family.lastPartner));
      edges.push({ from: family.partner ? 'partner' : 'self', to: 'lastPartner', style: 'lastPartner' });
    }

    const partnerKeys = new Map<number, string>();
    const partnerId = idOf(family.partner);
    const lastPartnerId = idOf(family.lastPartner);
    if (partnerId !== null) partnerKeys.set(partnerId, 'partner');
    if (lastPartnerId !== null) partnerKeys.set(lastPartnerId, 'lastPartner');

    const childIds = new Set(family.children.map((c) => c.serializeId));
    const children: TreeNode[] = family.children.map((c) => {
      const key = `child-${c.serializeId}`;
      edges.push({ from: 'self', to: key });
      const [f, m] = ascendantsOf(c);
      const other = f === dwellerId ? m : f;
      const otherKey = partnerKeys.get(other);
      if (otherKey) edges.push({ from: otherKey, to: key });
      return { key, role: 'Child', kind: 'dweller', dweller: c };
    });

    const grandchildren: TreeNode[] = family.grandchildren.map((g) => {
      const key = `gc-${g.serializeId}`;
      const [f, m] = ascendantsOf(g);
      const parents = [f, m].filter((p) => childIds.has(p));
      if (parents.length === 0) edges.push({ from: 'self', to: key });
      parents.forEach((p) => edges.push({ from: `child-${p}`, to: key }));
      return { key, role: 'Grandchild', kind: 'dweller', dweller: g };
    });

    const allNodes = [...grandparents, ...parents, ...selfRow, ...children, ...grandchildren];
    const dwellerIds = [...new Set(allNodes.flatMap((n) => (n.kind === 'dweller' ? [n.dweller.serializeId] : [])))];

    return { family, grandparents, parents, selfRow, children, grandchildren, edges, dwellerIds };
  }, [save, dwellerId]);

  // Connecting lines, measured from the rendered nodes.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ d: string; style?: Edge['style'] }[]>([]);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const edges = tree?.edges;

  const measure = useCallback(() => {
    const el = canvasRef.current;
    if (!el || !edges) return;
    const base = el.getBoundingClientRect();
    const rectOf = (key: string) => el.querySelector(`[data-node="${key}"]`)?.getBoundingClientRect();
    const out: { d: string; style?: Edge['style'] }[] = [];
    for (const e of edges) {
      const a = rectOf(e.from);
      const b = rectOf(e.to);
      if (!a || !b) continue;
      if (e.style) {
        const [l, r] = a.left <= b.left ? [a, b] : [b, a];
        const y = l.top + l.height / 2 - base.top;
        out.push({ d: `M ${l.right - base.left} ${y} H ${r.left - base.left}`, style: e.style });
      } else {
        const x1 = a.left + a.width / 2 - base.left;
        const y1 = a.bottom - base.top;
        const x2 = b.left + b.width / 2 - base.left;
        const y2 = b.top - base.top;
        const midY = (y1 + y2) / 2;
        out.push({ d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}` });
      }
    }
    setLines(out);
    setCanvas({ w: el.offsetWidth, h: el.offsetHeight });
  }, [edges]);

  useLayoutEffect(() => {
    measure();
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, renaming]);

  if (!tree) return null;
  const { family, grandparents, parents, selfRow, children, grandchildren, dwellerIds } = tree;
  const isolated = grandparents.length === 0 && parents.length === 0 && selfRow.length === 1
    && children.length === 0 && grandchildren.length === 0;

  const selectedIds = dwellerIds.filter((id) => selected.has(id));
  const canApply = selectedIds.length > 0 && bulkLastName.trim() !== '';
  const applyBulkLastName = () => {
    const lastName = bulkLastName.trim();
    if (!lastName || selectedIds.length === 0) return;
    setVault((s) => selectedIds.reduce((acc, id) => editDweller(acc, id, (d) => setName(d, { lastName })) ?? acc, s));
    setBulkLastName('');
    setSelected(new Set());
  };
  const toggleRenaming = () => {
    setRenaming((r) => !r);
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-zinc-400" /> Parent / child</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-pink-400" /> Partner</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-zinc-500" /> Last partner</span>
        </div>
        <button
          type="button"
          onClick={toggleRenaming}
          aria-pressed={renaming}
          className={[
            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
            renaming ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200',
          ].join(' ')}
        >
          {renaming ? 'Done renaming' : 'Rename dwellers'}
        </button>
      </div>

      {renaming && (
        <div className="space-y-2 rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">
          <p className="text-sm text-zinc-300">
            Edit any name below (applies when you leave the field or press Enter). To give several dwellers the
            same last name, tick their boxes and apply it here.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={bulkLastName}
              onChange={(e) => setBulkLastName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canApply) applyBulkLastName(); }}
              placeholder="Last name"
              aria-label="Last name for the selected dwellers"
              className="w-40 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={applyBulkLastName}
              disabled={!canApply}
              className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 disabled:hover:bg-green-600 disabled:cursor-not-allowed"
            >
              {selectedIds.length === 0
                ? 'Select dwellers first'
                : `Apply to ${selectedIds.length} selected`}
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="px-3 py-1 rounded text-sm text-zinc-300 hover:text-zinc-100 bg-zinc-700 hover:bg-zinc-600"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded border border-zinc-700 bg-zinc-900/60 p-4 overflow-x-auto">
        <div ref={canvasRef} className="relative min-w-fit flex flex-col items-center gap-10 py-2">
          <svg
            className="absolute left-0 top-0 pointer-events-none"
            width={canvas.w}
            height={canvas.h}
            aria-hidden="true"
          >
            {lines.map((l, i) => (
              <path
                key={i}
                d={l.d}
                fill="none"
                strokeWidth={2}
                stroke={l.style === 'partner' ? '#f472b6' : l.style === 'lastPartner' ? '#71717a' : '#a1a1aa'}
                strokeDasharray={l.style ? '5 4' : undefined}
              />
            ))}
          </svg>
          {grandparents.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-3">
              <Row nodes={grandparents.slice(0, 2)} rename={renameState} />
              <Row nodes={grandparents.slice(2)} rename={renameState} />
            </div>
          )}
          <Row nodes={parents} rename={renameState} gapClass="gap-x-[220px] gap-y-3" />
          <Row nodes={selfRow} rename={renameState} gapClass="gap-x-6 gap-y-3" />
          <Row nodes={children} rename={renameState} />
          <Row nodes={grandchildren} rename={renameState} />
        </div>
      </div>

      {isolated && <p className="text-zinc-500 text-sm">No family recorded for this dweller.</p>}

      {family.relationships.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-400">Getting close to:</span>
          {family.relationships.map(({ ref, value }, i) =>
            ref.kind === 'present' ? (
              <span key={i} className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-zinc-100">
                {fullNameOf(ref.dweller)}
                {value !== null && <span className="text-zinc-500 text-xs"> · level {value}</span>}
              </span>
            ) : (
              <span key={i} className="italic text-zinc-500">Left the vault</span>
            ),
          )}
        </div>
      )}

      <p className="text-zinc-500 text-xs">
        Click a relative to open them. Relatives shown as "Left the vault" are no longer in this save.
        Related dwellers can't have children together.
      </p>
    </div>
  );
}
