"use client";

import { useEffect, useRef, useState } from "react";
import { saveThemePreference } from "@/app/actions";

type Family = "aurora" | "editorial" | "mission" | "clay";

const THEMES: { id: Family; name: string; swatch: string }[] = [
  { id: "aurora", name: "Aurora Glass", swatch: "linear-gradient(135deg,#7c3aed,#d946ef,#06b6d4)" },
  { id: "editorial", name: "Editorial Mono", swatch: "linear-gradient(135deg,#4f46e5,#a5b4fc)" },
  { id: "mission", name: "Mission Control", swatch: "linear-gradient(135deg,#0f1620,#22d3ee)" },
  { id: "clay", name: "Soft Clay", swatch: "linear-gradient(135deg,#a78bfa,#34d399)" },
];

export default function ThemeControls() {
  const [family, setFamily] = useState<Family>("aurora");
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reflect whatever the no-flash init script already applied (post-mount to
  // avoid a hydration mismatch).
  useEffect(() => {
    const el = document.documentElement;
    /* eslint-disable react-hooks/set-state-in-effect -- syncing to the value
       the no-flash script already applied to <html>, post-mount by design. */
    setFamily((el.getAttribute("data-theme") as Family) || "aurora");
    setDark(el.classList.contains("dark"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickFamily(id: Family) {
    setFamily(id);
    setOpen(false);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("theme-family", id);
    // Persist across devices (best-effort; the local change already applied).
    void saveThemePreference(id, dark ? "dark" : "light").catch(() => {});
  }

  function toggleMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    void saveThemePreference(family, next ? "dark" : "light").catch(() => {});
  }

  const current = THEMES.find((t) => t.id === family) ?? THEMES[0];

  return (
    <div className="flex items-center gap-2">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Change theme"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-fg hover:bg-track"
        >
          <span
            aria-hidden
            className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
            style={{ background: current.swatch }}
          />
          <span className="hidden sm:inline">{current.name}</span>
          <span aria-hidden className="text-faint">
            ▾
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="panel absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl p-1"
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="menuitemradio"
                aria-checked={t.id === family}
                onClick={() => pickFamily(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-track ${
                  t.id === family ? "font-semibold" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: t.swatch }}
                />
                <span className="flex-1">{t.name}</span>
                {t.id === family && (
                  <span aria-hidden className="text-brand">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggleMode}
        aria-label="Toggle dark mode"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg hover:bg-track"
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
