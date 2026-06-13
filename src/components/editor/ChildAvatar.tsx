/**
 * Portrait-slot placeholder for child dwellers. It reuses the EXACT same element
 * and sizing as an adult avatar — a 512×512 canvas filled to the box — so the
 * editor layout (columns, tab strip) stays identical. We never draw a model on
 * the canvas and just label it "Child" in the center, mirroring how the footer
 * CharacterCard marks a child. Rendering the real canvas element is what reserves
 * the avatar column's width; a plain <div> would not, which collapses the layout.
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-zinc-500 italic text-xs text-center px-2">Child</span>
      </div>
    </>
  );
}
