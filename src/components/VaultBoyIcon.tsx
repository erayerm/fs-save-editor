/**
 * The thumbs-up Vault Boy as a single-color icon. Implemented as a <span> masked by a
 * silhouette PNG and filled with `currentColor`, so it tints with the surrounding text
 * color (gray at rest, white on hover) the same way CoffeeIcon does.
 */
export function VaultBoyIcon({ size = 18, className }: { size?: number; className?: string }) {
  const url = "url('/vault-boy-silhouette.png')";
  return (
    <span
      role="img"
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}
