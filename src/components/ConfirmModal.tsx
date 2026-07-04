"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}

export default function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  secondaryAction,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mounted, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="panel relative z-10 w-full max-w-sm rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2
            id="confirm-modal-title"
            className="text-sm font-semibold text-fg"
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
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

        <div className="px-5 py-4">
          <p className="text-sm text-muted">{body}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-faint hover:text-fg"
          >
            {cancelLabel}
          </button>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="rounded-lg border border-border px-4 py-2 text-sm text-red-600 transition hover:bg-track dark:text-red-400"
            >
              {secondaryAction.label}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
