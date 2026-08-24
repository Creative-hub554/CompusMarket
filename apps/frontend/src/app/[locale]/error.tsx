"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Unhandled application error:", error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 mb-6">
        <AlertTriangle size={30} />
      </span>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        Something went wrong
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        An unexpected error occurred. Please try again — if it keeps happening,
        the issue will resolve itself shortly.
      </p>
      <button onClick={reset} className="btn-primary inline-flex items-center gap-2 px-6">
        <RotateCcw size={16} />
        Try again
      </button>
    </div>
  );
}
