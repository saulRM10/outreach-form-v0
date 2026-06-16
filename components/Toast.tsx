"use client";

import { useEffect } from "react";

export type ToastKind = "success" | "error";

interface ToastProps {
  kind: ToastKind;
  message: string;
  onDismiss: () => void;
}

export default function Toast({ kind, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, kind === "success" ? 3000 : 5000);
    return () => clearTimeout(t);
  }, [kind, onDismiss]);

  const isSuccess = kind === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl px-4 py-3 text-white shadow-lg"
      style={{ backgroundColor: isSuccess ? "#6cb800" : "#d33a3a" }}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {isSuccess ? (
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path
              d="M5 10.5l3.2 3.2L15 6.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path
              d="M10 6v5M10 14h.01"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        )}
      </span>
      <p className="flex-1 text-[15px] leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 hover:bg-white/20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
