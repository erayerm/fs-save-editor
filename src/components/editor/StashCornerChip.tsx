/** Top-left overlay on a stash-view tile: the stashed quantity, or a label like "Equipped". */
export function StashCornerChip({ count, children }: { count?: number; children?: React.ReactNode }) {
  return (
    <span
      className="absolute top-1.5 left-1.5 px-1.5 rounded bg-zinc-800/90 text-xs font-mono font-semibold text-emerald-400 pointer-events-none"
      aria-label={count !== undefined ? `${count} in stash` : undefined}
    >
      {count !== undefined ? `×${count}` : children}
    </span>
  );
}
