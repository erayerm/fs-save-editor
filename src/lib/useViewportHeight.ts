import { useEffect, useState } from 'react';

const read = () => (typeof window === 'undefined' ? 1080 : window.innerHeight);

/** Current window.innerHeight, updated on resize. */
export function useViewportHeight(): number {
  const [h, setH] = useState(read);
  useEffect(() => {
    const onResize = () => setH(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}
