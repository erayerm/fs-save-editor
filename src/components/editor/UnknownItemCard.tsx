/**
 * Pinned card shown at the front of a picker for an equipped item the editor
 * doesn't recognize. It is always "selected" (the item IS equipped) and never
 * changes the save — clicking it (or its warning badge) opens an explanatory
 * modal. A skeleton stands in for the avatar (we can't render unknown art), and
 * a yellow warning badge sits in the top-right corner.
 */
export function UnknownItemCard({
  id, width = 170, height = 170, onWarn,
}: {
  id: string;
  width?: number;
  height?: number;
  onWarn: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={true}
      title={`Unsupported item: ${id}`}
      onClick={onWarn}
      className="relative rounded border border-green-400 bg-green-950/40 ring-1 ring-green-400 flex flex-col items-center overflow-hidden"
      style={{ width, height }}
    >
      {/* Warning badge, top-right */}
      <span
        role="img"
        aria-label="Unsupported item — more info"
        onClick={(e) => { e.stopPropagation(); onWarn(); }}
        className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-zinc-900 shadow"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>

      {/* Skeleton standing in for the un-renderable avatar */}
      <div className="flex-1 w-full p-3 flex items-center justify-center">
        <div className="w-full h-full rounded-md bg-zinc-700/40 animate-pulse" />
      </div>

      <div className="w-full px-1 pb-1 text-center leading-tight">
        <div className="text-[11px] text-zinc-200 truncate" title={id}>{id}</div>
        <div className="text-[10px] font-medium text-amber-400">Unsupported</div>
      </div>
    </button>
  );
}
