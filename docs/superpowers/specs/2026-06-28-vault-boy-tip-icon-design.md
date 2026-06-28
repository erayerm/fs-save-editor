# Vault Boy Silhouette Tip Icon — Design

**Date:** 2026-06-28
**Branch:** `feat/item-favorites` (current working branch)

## Summary

Replace the coffee icon in the header "Tip" button with a monochrome silhouette of the
thumbs-up Vault Boy. The silhouette tints with `currentColor` exactly like the coffee
icon (light gray normally, white on hover), so it integrates with the existing button.
The intent is curiosity: an unexpected little figure people click to discover.

## Behavior

- The Tip button ([Header.tsx](../../../src/components/Header.tsx)) links to `TIP_URL`
  and currently renders `<CoffeeIcon size={16} />`. It will render the Vault Boy
  silhouette instead.
- The silhouette is a single color driven by `currentColor`: gray at rest, white on
  hover (inherited from the button's `text-zinc-200 hover:text-white`).
- No behavior change to the link, label, or button styling otherwise.

## Asset

- Source: `vault-boy-fav.png` (waist-up thumbs-up Vault Boy, recoverable from git
  history — commit `b2786f2`). Waist-up reads better than full-body at ~18px.
- Generate `public/vault-boy-silhouette.png`: take the source's alpha channel, fill every
  opaque pixel a single solid color (black), keep the background transparent, then trim
  to the figure's bounding box so the icon centers cleanly. Only the alpha matters — the
  PNG is used purely as a CSS mask.

## Components

### `src/components/VaultBoyIcon.tsx` (new)

Same interface as `CoffeeIcon`: `{ size?: number; className?: string }` (default size
matches the call site). Renders a `<span>` that is masked by the silhouette and filled
with `currentColor`:

```tsx
export function VaultBoyIcon({ size = 18, className }: { size?: number; className?: string }) {
  const mask = {
    WebkitMaskImage: "url('/vault-boy-silhouette.png')",
    maskImage: "url('/vault-boy-silhouette.png')",
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  } as const;
  return (
    <span
      role="img"
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-block', width: size, height: size, backgroundColor: 'currentColor', ...mask }}
    />
  );
}
```

### `src/components/Header.tsx` (modify)

- Replace `<CoffeeIcon size={16} />` with `<VaultBoyIcon size={18} />`.
- Replace the `CoffeeIcon` import with `VaultBoyIcon`.

### `src/components/CoffeeIcon.tsx` (delete if unused)

After the swap, delete `CoffeeIcon.tsx` only if no other file imports it (verify first;
e.g. `ExportSuccessModal.tsx` must not use it). If it is used elsewhere, leave it.

## Testing

- `VaultBoyIcon`: renders a `<span>` with `background-color` resolving to `currentColor`
  and a `mask-image` referencing the silhouette; respects the `size` prop (width/height).
- `Header`: the Tip link renders the Vault Boy icon (the masked span) and no longer the
  coffee `<svg>` paths.

## Out of Scope

- Animation or hover effects beyond the existing color transition.
- Vectorizing the silhouette to SVG (mask PNG is pixel-perfect and simpler).
- Changing the tip destination or button layout.
