import type { Dweller, SaveJson } from '../types/save';

// ---------------------------------------------------------------------------
// Read-only family tree from dweller.relations:
//  - ascendants: [father, mother, father's father, father's mother,
//    mother's father, mother's mother]; -1 = none.
//  - Negative ids (other than -1) point to relatives who have left the vault.
//    The positive id may since belong to someone else, so they aren't resolved.
//  - partner / lastPartner: current and most recent partner; -1 = none.
//  - relations: [{ dweller, value }], the dweller's ongoing relationships.
// Children, grandchildren and siblings are found by scanning other dwellers'
// ascendants.
// ---------------------------------------------------------------------------

export type RelativeRef =
  | { kind: 'present'; dweller: Dweller }
  | { kind: 'gone' };

export interface Sibling { dweller: Dweller; half: boolean }

export interface Family {
  father: RelativeRef | null;
  mother: RelativeRef | null;
  /** Always four slots: father's father, father's mother, mother's father, mother's mother. */
  grandparents: { label: string; ref: RelativeRef | null }[];
  partner: RelativeRef | null;
  lastPartner: RelativeRef | null;
  children: Dweller[];
  grandchildren: Dweller[];
  siblings: Sibling[];
  relationships: { ref: RelativeRef; value: number | null }[];
}

interface Relations {
  ascendants?: unknown;
  partner?: unknown;
  lastPartner?: unknown;
  relations?: unknown;
}

const GRANDPARENT_LABELS = [
  "Father's father", "Father's mother", "Mother's father", "Mother's mother",
];

const relationsOf = (d: Dweller): Relations => (d.relations ?? {}) as Relations;

export function ascendantsOf(d: Dweller): number[] {
  const a = relationsOf(d).ascendants;
  const ids = Array.isArray(a) ? a : [];
  return Array.from({ length: 6 }, (_, i) => (typeof ids[i] === 'number' ? ids[i] : -1));
}

export function getFamily(save: SaveJson, id: number): Family | null {
  const dwellers = save.dwellers?.dwellers ?? [];
  const self = dwellers.find((d) => d.serializeId === id);
  if (!self) return null;
  const byId = new Map(dwellers.map((d) => [d.serializeId, d]));

  const resolve = (ref: unknown): RelativeRef | null => {
    if (typeof ref !== 'number' || ref === -1) return null;
    if (ref < 0 || ref === id) return { kind: 'gone' };
    const d = byId.get(ref);
    return d ? { kind: 'present', dweller: d } : { kind: 'gone' };
  };

  const rel = relationsOf(self);
  const asc = ascendantsOf(self);
  const [fatherId, motherId] = asc;

  const others = dwellers.filter((d) => d.serializeId !== id);
  const children = others.filter((d) => {
    const [f, m] = ascendantsOf(d);
    return f === id || m === id;
  });
  const grandchildren = others.filter((d) => ascendantsOf(d).slice(2).includes(id));

  const siblings: Sibling[] = [];
  for (const d of others) {
    const [f, m] = ascendantsOf(d);
    const sameFather = fatherId > 0 && f === fatherId;
    const sameMother = motherId > 0 && m === motherId;
    if (sameFather || sameMother) siblings.push({ dweller: d, half: !(sameFather && sameMother) });
  }

  const relationships: Family['relationships'] = [];
  if (Array.isArray(rel.relations)) {
    for (const r of rel.relations as { dweller?: unknown; value?: unknown }[]) {
      const ref = resolve(r?.dweller);
      if (ref) relationships.push({ ref, value: typeof r.value === 'number' ? r.value : null });
    }
  }

  const grandparents = asc.slice(2).map((gid, i) => ({ label: GRANDPARENT_LABELS[i], ref: resolve(gid) }));

  const partner = resolve(rel.partner);
  const lastPartner = resolve(rel.lastPartner);
  const samePartner = partner?.kind === 'present' && lastPartner?.kind === 'present'
    && partner.dweller.serializeId === lastPartner.dweller.serializeId;

  return {
    father: resolve(fatherId),
    mother: resolve(motherId),
    grandparents,
    partner,
    lastPartner: samePartner ? null : lastPartner,
    children,
    grandchildren,
    siblings,
    relationships,
  };
}
