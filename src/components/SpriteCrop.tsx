import type { CSSProperties } from 'react';
import type { IconRect } from '../types/icons';

/**
 * Render a single sprite cropped from a UI atlas PNG via CSS background-position.
 * The sprite is scaled to fit within a `size`×`size` box, preserving aspect ratio.
 */
export function SpriteCrop({
  rect,
  size,
  className,
  title,
}: {
  rect: IconRect;
  size: number;
  className?: string;
  title?: string;
}) {
  const scale = size / Math.max(rect.w, rect.h);
  const style: CSSProperties = {
    width: rect.w * scale,
    height: rect.h * scale,
    backgroundImage: `url(/atlas/${rect.atlas})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${rect.aw * scale}px ${rect.ah * scale}px`,
    backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
    flexShrink: 0,
  };
  return <div className={className} style={style} title={title} role="img" aria-label={title} />;
}
