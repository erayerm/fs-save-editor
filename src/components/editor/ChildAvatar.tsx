/**
 * Portrait-slot placeholder for child dwellers. It reuses the EXACT same element
 * and sizing as an adult avatar — a 512×512 canvas filled to the box — so the
 * editor layout (columns, tab strip) stays identical. We simply never draw a
 * model on the canvas and overlay a static (non-animated) skeleton plus a "Child"
 * marker. Rendering the real canvas element is what reserves the avatar column's
 * width; a plain <div> would not, which collapses the layout.
 */
export function ChildAvatar() {
  return (
    <>
      <canvas
        width={512}
        height={512}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        className="bg-zinc-950 rounded border border-zinc-700"
        aria-hidden="true"
      />
      {/* Static (non-pulsing) skeleton overlay. */}
      <div className="absolute inset-0 p-4 pointer-events-none">
        <div className="w-full h-full rounded-md bg-zinc-700/40" />
      </div>
      <span className="absolute top-2 left-2 z-10 rounded px-2 py-0.5 text-[11px] font-semibold bg-sky-400 text-zinc-900">
        Child
      </span>
    </>
  );
}
