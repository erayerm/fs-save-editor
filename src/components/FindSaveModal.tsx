// src/components/FindSaveModal.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

// A single copyable path, shown in a monospace block with a copy-to-clipboard
// button on the right that briefly flips to a checkmark once copied.
function PathRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore silently.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 px-3 py-2 bg-zinc-900 rounded text-emerald-300 text-xs font-mono break-all leading-relaxed">
        {value}
      </code>
      <button
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy path"}
        title={copied ? "Copied" : "Copy path"}
        className="flex items-center justify-center w-9 shrink-0 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white transition-colors"
      >
        {copied ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    </div>
  );
}

function MonitorIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function FindSaveModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-save-title"
        className="relative flex flex-col gap-5 w-[34rem] max-w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 bg-zinc-800 rounded-xl shadow-xl text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex flex-col gap-1">
          <h2 id="find-save-title" className="text-lg font-bold">
            Where is my .sav file?
          </h2>
          <p className="text-sm text-zinc-400">
            Your save files are named{" "}
            <code className="text-emerald-300">Vault1.sav</code> to{" "}
            <code className="text-emerald-300">Vault4.sav</code>. Vaults 1 to 3
            are your normal vaults; Vault 4 is the experimental vault.
          </p>
        </div>

        {/* Windows PC */}
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <MonitorIcon />
            Windows (PC)
          </h3>
          <p className="text-sm text-zinc-400">
            Open File Explorer, click the address bar, paste the path below and
            press Enter:
          </p>
          <PathRow value="%LOCALAPPDATA%\FalloutShelter" />
          <p className="text-sm text-zinc-400">
            This shortcut opens the right folder automatically. If you prefer
            the full path, it is:
          </p>
          <PathRow value="C:\Users\<YourUsername>\AppData\Local\FalloutShelter" />
          <p className="text-xs text-zinc-500">
            Replace <code className="text-zinc-400">{"<YourUsername>"}</code>{" "}
            with your Windows account name. AppData is a hidden folder, so use
            the shortcut above if you cannot see it.
          </p>
        </section>

        {/* Android */}
        <section className="flex flex-col gap-2 pt-4 border-t border-zinc-700">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <PhoneIcon />
            Android
          </h3>
          <p className="text-sm text-zinc-400">
            Using a file manager, open this folder on your device:
          </p>
          <PathRow value="/storage/emulated/0/Android/data/com.bethsoft.falloutshelter/files" />
          <p className="text-sm text-zinc-400">
            The editor runs in your browser, so the round trip is:
          </p>
          <ol className="flex flex-col gap-1 text-sm text-zinc-400 list-decimal pl-5">
            <li>
              Copy the <code className="text-emerald-300">VaultX.sav</code> file
              from that folder to your computer (or open this page directly on
              your phone if it can reach the folder).
            </li>
            <li>Import it here, make your changes, then export the file.</li>
            <li>
              Copy the exported file back into the same folder, replacing the
              original.
            </li>
          </ol>
          <p className="text-xs text-zinc-500">
            On Android 11 and newer, access to the{" "}
            <code className="text-zinc-400">Android/data</code> folder is
            restricted. Use a file manager that can open it, or transfer the
            file over USB through a PC.
          </p>
        </section>

        <p className="text-xs text-green-400/90">
          Always keep a backup of your original .sav file before replacing it.
        </p>
      </div>
    </div>,
    document.body,
  );
}
