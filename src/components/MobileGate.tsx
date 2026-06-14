// src/components/MobileGate.tsx
import { useEffect, useState } from "react";
import { GITHUB_REPO_URL } from "../lib/constants";
import { GitHubIcon } from "./GitHubIcon";

// Phones and small touch devices: the editor layout (multi-column grids,
// drag and drop, hover states) is not usable there, so we block with a notice.
const MOBILE_QUERY =
  "(max-width: 767px), ((pointer: coarse) and (max-width: 1023px))";

// Treat environments without matchMedia (older browsers, jsdom tests) as desktop.
const canDetect = typeof window.matchMedia === "function";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => canDetect && window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    if (!canDetect) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function MobileGate() {
  return (
    <div className="h-screen flex items-center justify-center bg-zinc-900 text-zinc-100 p-6">
      <div className="flex flex-col items-center gap-4 p-8 bg-zinc-800 rounded-xl shadow-xl text-center max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Fallout Shelter Save Editor</h1>
        <p className="text-sm text-zinc-400">
          This app is not usable on mobile devices yet. Please open it on a
          desktop browser.
        </p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center mt-8 gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded font-medium text-sm transition-colors"
        >
          <GitHubIcon size={16} />
          GitHub
        </a>
      </div>
    </div>
  );
}
