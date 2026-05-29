const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadAtlas(filename: string): Promise<HTMLImageElement> {
  if (cache.has(filename)) return cache.get(filename)!;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load atlas ${filename}`));
    img.src = `/atlas/${filename}`;
  });
  cache.set(filename, p);
  return p;
}
