/**
 * Portrait-slot placeholder for child dwellers. Children have no customizable
 * model, so instead of rendering art we show a loading-style skeleton with a
 * small "Child" marker in the top-left corner.
 */
export function ChildAvatar() {
  return (
    <div className="relative w-full h-full rounded border border-zinc-700 bg-zinc-950 overflow-hidden">
      <span className="absolute top-2 left-2 z-10 rounded px-2 py-0.5 text-[11px] font-semibold bg-sky-400 text-zinc-900">
        Child
      </span>
      <div className="w-full h-full p-4">
        <div className="w-full h-full rounded-md bg-zinc-700/40 animate-pulse" />
      </div>
    </div>
  );
}
