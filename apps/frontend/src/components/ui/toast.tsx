"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastKind = "success" | "error";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  leaving?: boolean;
};

type Listener = (kind: ToastKind, message: string) => void;

let listener: Listener | null = null;
let nextId = 1;

function emit(kind: ToastKind, message: string) {
  listener?.(kind, message);
}

/** Module-level toast API — safe to call from anywhere in client code. */
export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
};

const AUTO_DISMISS_MS = 3800;
const MAX_VISIBLE = 4;

/** Mount once (locale layout) to render the toast stack. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const dismiss = (id: number) => {
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 220);
    };

    listener = (kind, message) => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    };
    return () => {
      listener = null;
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`glass-card pointer-events-auto flex items-start gap-2.5 rounded-xl px-3.5 py-3 shadow-[0_16px_32px_-12px_rgba(15,23,42,0.35)] transition-all duration-200 ${
            t.leaving
              ? "-translate-x-3 opacity-0"
              : "animate-slide-up opacity-100"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-500" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          )}
          <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            {t.message}
          </p>
          <button
            onClick={() => {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === t.id ? { ...item, leaving: true } : item
                )
              );
              setTimeout(() => {
                setItems((prev) => prev.filter((item) => item.id !== t.id));
              }, 220);
            }}
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
