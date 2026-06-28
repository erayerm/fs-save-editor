# Vault Boy Tip Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header Tip button's coffee icon with a `currentColor`-tinted silhouette of the thumbs-up Vault Boy.

**Architecture:** Generate a transparent-background silhouette PNG from the existing waist-up Vault Boy art, then render it via a `<span>` masked by that PNG with `background-color: currentColor` so it tints (gray → white on hover) exactly like the coffee icon.

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react (jsdom), Vite (`public/` served at root), Python + Pillow for the one-off asset generation.

---

## File Structure

- `public/vault-boy-silhouette.png` (new) — alpha-derived solid silhouette, transparent bg, trimmed.
- `src/components/VaultBoyIcon.tsx` (new) — masked `<span>` icon, same interface as `CoffeeIcon`.
- `src/components/Header.tsx` (modify) — swap the Tip button's icon.
- `tests/VaultBoyIcon.test.tsx` (new) — icon renders masked + currentColor.
- `tests/Header.test.tsx` (new or extend) — Tip link renders the icon span.

NOTE: `CoffeeIcon.tsx` is still imported by `src/components/ExportSuccessModal.tsx`, so it MUST NOT be deleted.

---

## Task 1: Generate the silhouette asset

**Files:**
- Create: `public/vault-boy-silhouette.png`

The source `vault-boy-fav.png` was removed from the working tree but still exists in git
commit `b2786f2`. Restore it to a temp path, derive the silhouette, then discard the temp.

- [ ] **Step 1: Restore the source art from git to a temp file**

Run:
```bash
git show b2786f2:public/vault-boy-fav.png > /tmp/vault-boy-src.png
```
Expected: `/tmp/vault-boy-src.png` exists (a waist-up thumbs-up Vault Boy PNG).

- [ ] **Step 2: Ensure Pillow is available**

Run: `python -m pip install --quiet Pillow && python -c "import PIL; print(PIL.__version__)"`
Expected: prints a version (e.g. `12.x`).

- [ ] **Step 3: Generate the silhouette**

Create and run this script (e.g. save as `/tmp/silhouette.py`):
```python
from PIL import Image

im = Image.open("/tmp/vault-boy-src.png").convert("RGBA")
w, h = im.size
ap = im.getchannel("A")
out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
src = ap.load()
for y in range(h):
    for x in range(w):
        if src[x, y] > 128:           # opaque figure pixel -> solid black silhouette
            op[x, y] = (0, 0, 0, 255)
bbox = out.getbbox()                  # trim transparent margins so the icon centers
out = out.crop(bbox)
out.save("public/vault-boy-silhouette.png")
print("silhouette size", out.size)
```
Run: `python /tmp/silhouette.py`
Expected: prints a size and writes `public/vault-boy-silhouette.png`.

- [ ] **Step 4: Sanity-check the asset is a single opaque color over transparency**

Run:
```bash
python -c "from PIL import Image; im=Image.open('public/vault-boy-silhouette.png').convert('RGBA'); cols={p for p in im.getdata() if p[3]>0}; print(len(cols), list(cols)[:3])"
```
Expected: `1 [(0, 0, 0, 255)]` — exactly one opaque color (black); the rest transparent.

- [ ] **Step 5: Commit**

```bash
git add public/vault-boy-silhouette.png
git commit -m "feat(tip): add Vault Boy silhouette asset for tip icon"
```

---

## Task 2: `VaultBoyIcon` component

**Files:**
- Create: `src/components/VaultBoyIcon.tsx`
- Test: `tests/VaultBoyIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/VaultBoyIcon.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VaultBoyIcon } from '../src/components/VaultBoyIcon';

describe('VaultBoyIcon', () => {
  it('renders a currentColor-filled span masked by the silhouette, sized by prop', () => {
    const { container } = render(<VaultBoyIcon size={20} className="x" />);
    const span = container.querySelector('span')!;
    expect(span).toBeTruthy();
    expect(span).toHaveClass('x');
    expect(span.style.backgroundColor).toBe('currentColor');
    expect(span.style.width).toBe('20px');
    expect(span.style.height).toBe('20px');
    const maskImg = span.style.maskImage || span.style.getPropertyValue('-webkit-mask-image');
    expect(maskImg).toContain('vault-boy-silhouette.png');
  });

  it('defaults size to 18', () => {
    const { container } = render(<VaultBoyIcon />);
    const span = container.querySelector('span')!;
    expect(span.style.width).toBe('18px');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/VaultBoyIcon.test.tsx`
Expected: FAIL — cannot import `VaultBoyIcon`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/VaultBoyIcon.tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/VaultBoyIcon.test.tsx`
Expected: PASS (both tests).

NOTE: if jsdom normalizes `maskImage` to empty but keeps `WebkitMaskImage`, the test's
`maskImg` fallback handles it. If both are empty in jsdom, change the assertion to read
`span.getAttribute('style')` and assert it contains `vault-boy-silhouette.png` — the
inline style string always includes it.

- [ ] **Step 5: Commit**

```bash
git add src/components/VaultBoyIcon.tsx tests/VaultBoyIcon.test.tsx
git commit -m "feat(tip): VaultBoyIcon masked currentColor icon"
```

---

## Task 3: Wire the icon into the Tip button

**Files:**
- Modify: `src/components/Header.tsx`
- Test: `tests/Header.test.tsx`

The Tip button is an `<a aria-label="Tip">` containing `<CoffeeIcon size={16} />`. Swap
the icon to `<VaultBoyIcon size={18} />`. Keep the `CoffeeIcon` import ONLY if it is used
elsewhere in Header (it is not — Header used it only here), but DO NOT delete
`CoffeeIcon.tsx` (ExportSuccessModal still imports it).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/Header.test.tsx  (create; if it exists, add this case)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../src/components/Header';

describe('Header tip button', () => {
  it('renders the Vault Boy icon (span), not a coffee svg', () => {
    render(<Header />);
    const tip = screen.getByLabelText('Tip');
    expect(tip.querySelector('span')).toBeTruthy();
    expect(tip.querySelector('svg')).toBeNull();
    expect(tip.querySelector('span')!.style.backgroundColor).toBe('currentColor');
  });
});
```

If `Header` needs props or context to render, read `src/components/Header.tsx` and the
existing test setup (e.g. `tests/App.test.tsx`) and provide the minimal wrapper/props
required — do not stub away the Tip button.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/Header.test.tsx`
Expected: FAIL — the Tip button still renders the coffee `<svg>`, no masked span.

- [ ] **Step 3: Implement the swap**

In `src/components/Header.tsx`:
- Change the import `import { CoffeeIcon } from './CoffeeIcon';` to
  `import { VaultBoyIcon } from './VaultBoyIcon';`
- Change `<CoffeeIcon size={16} />` to `<VaultBoyIcon size={18} />`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/Header.test.tsx && npx tsc -b`
Expected: PASS; no type errors. (`CoffeeIcon.tsx` remains for ExportSuccessModal.)

- [ ] **Step 5: Manual verification (dev server)**

Start the dev server, hover the Tip button: the Vault Boy silhouette shows in gray and
turns white on hover, sized ~18px, centered like the old coffee icon.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx tests/Header.test.tsx
git commit -m "feat(tip): use Vault Boy silhouette in the tip button"
```

---

## Self-Review Notes

- **Spec coverage:** asset generation from `vault-boy-fav.png` alpha, trimmed (Task 1);
  `VaultBoyIcon` with `currentColor` + mask, same interface as CoffeeIcon (Task 2);
  Header swap to size 18 (Task 3); `CoffeeIcon.tsx` preserved because ExportSuccessModal
  imports it (noted in Task 3). All covered.
- **Out of scope:** SVG vectorization, animations, tip-destination changes.
