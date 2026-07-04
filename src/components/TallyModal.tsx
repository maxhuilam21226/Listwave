"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function TallyModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    const observer = new MutationObserver(() =>
      setIsDark(html.classList.contains("dark")),
    );
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const modal = open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Feedback"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* container */}
      <div className="panel relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl">
        {/* themed header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-fg">Share feedback</h2>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition hover:bg-track hover:text-fg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/*
          In dark mode: CSS filter invert+hue-rotate is applied from the parent
          to the iframe's rendered output — this dark-themes the Tally form
          without needing to inject any CSS cross-origin. The container bg also
          flips so the edges match after inversion.
        */}
        <div style={{ background: isDark ? "#000" : "#fff" }}>
          <iframe
            src="https://tally.so/embed/vGbM60?alignLeft=1&hideTitle=1&transparentBackground=0&dynamicHeight=1"
            style={{
              width: "100%",
              height: 520,
              border: "none",
              display: "block",
              ...(isDark
                ? { filter: "invert(1) hue-rotate(180deg)" }
                : undefined),
            }}
            title="Feedback form"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-brand/40 bg-accent/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-accent/20"
      >
        Give feedback
      </button>
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
